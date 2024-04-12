"use client";

import FileSelect from "@/components/home/file-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import createClient from "@/lib/supabase/client";
import uploadFile from "@/lib/supabase/upload-file";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { ChatPromptTemplate, MessagesPlaceholder } from "langchain/prompts";
import { RunnableSequence } from "langchain/runnables";
import { AIMessage, HumanMessage } from "langchain/schema";
import { StringOutputParser } from "langchain/schema/output_parser";
import { formatDocumentsAsString } from "langchain/util/document";
import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient();
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

const model = new ChatOpenAI({
  openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

export default function Home() {
  const [userInput, setUserInput] = useState("");
  const [response, setResponse] = useState("");
  const [conversationHistory, setConversationHistory] = useState<
    (HumanMessage | AIMessage)[]
  >([]);
  const [files, setFiles] = useState<File[]>([]);
  const [vectorStore, setVectorStore] = useState<SupabaseVectorStore>();
  const [isPreparingVectors, setIsPreparingVectors] = useState(false);

  const storeVectors = async (fileUrl: string) => {
    const res = await fetch(`/api/store-vector`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        fileUrl: fileUrl,
      }),
    });
    console.log("res", res);
  };

  const handleFileSubmit = async () => {
    if (files.length > 0) {
      setIsPreparingVectors(true);
      const fileUrl = await uploadFile(uuidv4(), files[0]);
      await storeVectors(fileUrl);
      const vectorStore = new SupabaseVectorStore(embeddings, {
        client: supabase,
        tableName: "documents",
        // filter: { source: fileUrl },
        queryName: "match_documents",
      });
      setVectorStore(vectorStore);
      setIsPreparingVectors(false);
    }
  };

  const handleSubmit = async () => {
    if (!vectorStore) return;

    const prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        `Answer the question based only on the following context: {context}`,
      ],
      new MessagesPlaceholder("conversation_history"),
      ["user", "{question}"],
    ]);
    const retriever = vectorStore.asRetriever();
    const retrieverChain = RunnableSequence.from([
      (prevResult) => prevResult.question,
      retriever,
      formatDocumentsAsString,
    ]);
    const answerChain = prompt.pipe(model).pipe(new StringOutputParser());

    const chain = RunnableSequence.from([
      {
        context: retrieverChain,
        question: (input) => input.question,
        conversation_history: (input) => input.conversation_history,
      },
      answerChain,
    ]);
    const res = await chain.invoke({
      conversation_history: conversationHistory,
      question: userInput,
    });
    setConversationHistory((prev) => [
      ...prev,
      new HumanMessage(userInput),
      new AIMessage(res),
    ]);
    setResponse(res);
  };

  console.log("conversationHistory", conversationHistory);

  return (
    <div className="relative flex flex-col items-center gap-y-8 p-24">
      <h1 className="border-primary rounded-sm border-4 px-8 py-4 text-2xl font-bold text-white">
        Talk to AI with PDF
      </h1>
      <div className="flex w-full flex-col gap-y-4">
        <FileSelect files={files} setFiles={setFiles} acceptedFileCount={1} />
        {(!vectorStore || isPreparingVectors) && (
          <div className="flex justify-center">
            <Button
              onClick={(e) => {
                e.preventDefault();
                handleFileSubmit();
              }}
              disabled={isPreparingVectors}
            >
              OK
            </Button>
          </div>
        )}
        {vectorStore && (
          <div className="text-center text-lg font-semibold underline">{`You are all set. Let's start asking AI about the file!`}</div>
        )}
        {conversationHistory.map(
          (conversation: HumanMessage | AIMessage, index: number) => (
            <div
              key={index}
              className={`flex ${index % 2 === 0 ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`mr-0 rounded-lg px-4 py-2 ${index % 2 === 0 ? "bg-primary text-white" : "bg-gray-200 text-gray-900"}`}
              >
                {conversation.content.toString()}
              </div>
            </div>
          ),
        )}
      </div>

      <div className="fixed bottom-0 flex w-full max-w-[888px] gap-x-2 bg-black py-2">
        <Input
          className="flex-1 border bg-white p-2"
          onChange={(e) => setUserInput(e.target.value)}
        />
        <Button
          onClick={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="rounded-lg px-4 py-2 text-white"
        >
          Submit
        </Button>
      </div>
    </div>
  );
}
