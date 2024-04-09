"use client";

import createClient from "@/lib/supabase/client";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { PromptTemplate } from "langchain/prompts";
import { RunnableSequence } from "langchain/runnables";
import { StringOutputParser } from "langchain/schema/output_parser";
import { formatDocumentsAsString } from "langchain/util/document";
import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import { useEffect, useState } from "react";
// Or, in web environments:
// import { WebPDFLoader } from "langchain/document_loaders/web/pdf";
// const blob = new Blob(); // e.g. from a file input
// const loader = new WebPDFLoader(blob);
// const outputParser = new StringOutputParser();

const supabase = createClient();
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});
const vectorStore = new SupabaseVectorStore(embeddings, {
  client: supabase,
  tableName: "documents",
  queryName: "match_documents",
});
const retriever = vectorStore.asRetriever();

const model = new ChatOpenAI({
  openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

export default function Home() {
  const [userInput, setUserInput] = useState("");
  const [response, setResponse] = useState("");
  const [conversationHistory, setConversationHistory] = useState<string[]>([
    "",
    "",
  ]);

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

  const getFormattedConversationHistory = (): string => {
    return conversationHistory.length === 0
      ? ""
      : conversationHistory
          .map((message, index) => {
            return `${index % 2 === 0 ? "Human" : "AI"}: ${message}`;
          })
          .join("\n");
  };

  const handleSubmit = async () => {
    // await storeVectors();

    // const template = `Who is the prime minister or president of {country}?`;
    // const prompt = PromptTemplate.fromTemplate(template);
    const prompt = PromptTemplate.fromTemplate(`
      Answer the question based only on the following context.
      Context: {context}
      Question: {question}
    `);
    // const prompt = PromptTemplate.fromTemplate(userInput);
    // const combineDocuments = (docs: any) => {
    //   return docs.map((doc: any) => doc.pageContent).join("\n\n");
    // };
    // const chain = prompt.pipe(chatModel).pipe(outputParser).pipe(retriever).pipe(combineDocuments);

    const retrieverChain = RunnableSequence.from([
      (prevResult) => prevResult.question,
      retriever,
      formatDocumentsAsString,
    ]);
    const answerChain = prompt.pipe(model).pipe(new StringOutputParser());

    const chain = RunnableSequence.from([
      // {
      //   original_input: new RunnablePassthrough(),
      // },
      {
        context: retrieverChain,
        question: (input) => input.question,
      },
      answerChain,
    ]);
    const res = await chain.invoke({
      // conversation_history: getFormattedConversationHistory(),
      question: userInput,
    });
    setConversationHistory((prev) => [...prev, userInput, res]);
    setResponse(res);
  };

  return (
    <main className="flex min-h-screen flex-col items-center gap-y-4 p-24">
      <textarea
        className="h-32 w-[500px] border p-2"
        onChange={(e) => setUserInput(e.target.value)}
      />
      <button
        onClick={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="rounded-lg bg-sky-500 px-4 py-2 text-white"
      >
        Submit
      </button>
      <div className="mt-8 text-gray-500">{response}</div>
    </main>
  );
}
