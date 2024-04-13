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
import { useRef, useState } from "react";
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
  const [conversationHistory, setConversationHistory] = useState<
    (HumanMessage | AIMessage)[]
  >([]);
  const [files, setFiles] = useState<File[]>([]);
  const [vectorStore, setVectorStore] = useState<SupabaseVectorStore>();
  const [isPreparingVectors, setIsPreparingVectors] = useState(false);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);

  const fileInputRef = useRef<HTMLDivElement | null>(null);

  const storeVectors = async (sessionId: string, fileUrl: string) => {
    const res = await fetch(`/api/store-vector`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        session_id: sessionId,
        file_url: fileUrl,
      }),
    });
    console.log("storeVectors Response", res);
  };

  const handleFileSubmit = async () => {
    if (files.length > 0) {
      setIsPreparingVectors(true);
      const sessionId = uuidv4();
      const fileUrl = await uploadFile(sessionId, files[0]);
      await storeVectors(sessionId, fileUrl);
      const vectorStore = new SupabaseVectorStore(embeddings, {
        client: supabase,
        tableName: "documents",
        filter: { session_id: sessionId },
        queryName: "match_documents",
      });

      fileInputRef.current?.classList.remove("max-h-[360px]");
      fileInputRef.current?.classList.add("max-h-0");

      setVectorStore(vectorStore);

      setTimeout(() => {
        setIsPreparingVectors(false);
      }, 5000);
    }
  };

  const handleSubmit = async () => {
    if (!vectorStore) return;

    setIsGeneratingResponse(true);

    setConversationHistory((prev) => [...prev, new HumanMessage(userInput)]);
    setUserInput("");

    const prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        `Answer the question based ONLY on the following context: {context}. Even if you can't find the answer in this context, don't search external information. Just say "I'm sorry. I can't find the information."`,
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
    setConversationHistory((prev) => [...prev, new AIMessage(res)]);

    setIsGeneratingResponse(false);
  };

  return (
    <div className="relative flex flex-col items-center p-24">
      <h1 className="rounded-sm px-8 py-4 text-4xl font-bold text-white">
        Talk to AI with PDF
      </h1>
      <div className="flex w-full flex-col">
        {(!vectorStore || isPreparingVectors) && (
          <div
            className="flex max-h-[360px] flex-col gap-y-2 overflow-hidden transition-all duration-[2000ms]"
            ref={fileInputRef}
          >
            <div className="min-h-8" />
            <FileSelect
              files={files}
              setFiles={setFiles}
              acceptedFileCount={1}
            />
            <div className="flex justify-center">
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  handleFileSubmit();
                }}
                disabled={isPreparingVectors}
                className="flex items-center gap-x-1"
              >
                {isPreparingVectors && (
                  <span className="loading loading-spinner loading-xs opacity-75" />
                )}
                <span>OK</span>
              </Button>
            </div>
          </div>
        )}
        {vectorStore && (
          <div className="mt-8 text-center text-lg font-semibold underline">{`You are all set. Let's start asking AI about the file!`}</div>
        )}
        <div className="mt-8 flex flex-col gap-y-4">
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
        {isGeneratingResponse && (
          <div className="flex justify-start">
            <div className="mr-0 flex items-center rounded-lg bg-gray-200 px-4 py-2 text-gray-900">
              <span className="loading loading-dots loading-md opacity-50" />
            </div>
          </div>
        )}
      </div>

      {vectorStore && (
        <form
          className="fixed bottom-0 flex w-full max-w-[888px] gap-x-2 bg-black py-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <Input
            className="flex-1 border bg-white p-2"
            onChange={(e) => setUserInput(e.target.value)}
            value={userInput}
            placeholder="Teach me a summary of this file..."
          />
          <Button
            type="submit"
            className="flex items-center gap-x-1 rounded-lg px-4 py-2 text-white"
            disabled={isGeneratingResponse}
          >
            Send
          </Button>
        </form>
      )}
      <div className="absolute -top-[400px] left-1/2 -z-50 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-primary opacity-60 blur-[200px]"></div>
    </div>
  );
}
