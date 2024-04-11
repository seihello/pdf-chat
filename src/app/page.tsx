"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import createClient from "@/lib/supabase/client";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { ChatPromptTemplate, MessagesPlaceholder } from "langchain/prompts";
import { RunnableSequence } from "langchain/runnables";
import { AIMessage, HumanMessage } from "langchain/schema";
import { StringOutputParser } from "langchain/schema/output_parser";
import { formatDocumentsAsString } from "langchain/util/document";
import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import { useEffect, useState } from "react";

const supabase = createClient();
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});
const vectorStore = new SupabaseVectorStore(embeddings, {
  client: supabase,
  tableName: "documents",
  // filter: { source: "public/Seisuke_Yamada_Resume.pdf" },
  queryName: "match_documents",
});
const retriever = vectorStore.asRetriever();

const model = new ChatOpenAI({
  openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

export default function Home() {
  const [userInput, setUserInput] = useState("");
  const [response, setResponse] = useState("");
  const [conversationHistory, setConversationHistory] = useState<
    (HumanMessage | AIMessage)[]
  >([]);

  useEffect(() => {
    const run = async () => {};
    run();
  }, []);

  const storeVectors = async () => {
    const res = await fetch(`/api/store-vector`, {
      method: "POST",
      // body: JSON.stringify(submitData),
      headers: {
        "content-type": "application/json",
      },
    });
    console.log("res", res);
  };

  const handleSubmit = async () => {
    // await storeVectors();

    const prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        `Answer the question based only on the following context: {context}`,
      ],
      new MessagesPlaceholder("conversation_history"),
      ["user", "{question}"],
    ]);
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
    <main className="relative flex flex-col items-center gap-y-4 p-24">
      <h1 className="text-primary text-2xl font-bold">Talk to AI with PDF</h1>

      <div className="flex w-full flex-col gap-y-4">
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
    </main>
  );
}
