"use client";

import FileSelect from "@/components/home/file-select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import createClient from "@/lib/supabase/client";
import uploadFile from "@/lib/supabase/upload-file";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { ChatPromptTemplate, MessagesPlaceholder } from "langchain/prompts";
import { RunnableSequence } from "langchain/runnables";
import { AIMessage, HumanMessage } from "langchain/schema";
import { StringOutputParser } from "langchain/schema/output_parser";
import { formatDocumentsAsString } from "langchain/util/document";
import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import { useEffect, useRef, useState } from "react";
import { FaAnglesDown, FaRegFilePdf } from "react-icons/fa6";
import { v4 as uuidv4 } from "uuid";

const ACCEPTED_FILE_COUNT = 1;

const supabase = createClient();
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

const model = new ChatOpenAI({
  openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

export default function MainView() {
  const [userInput, setUserInput] = useState("");
  const [conversationHistory, setConversationHistory] = useState<
    (HumanMessage | AIMessage)[]
  >([]);
  const [files, setFiles] = useState<File[]>([]);
  const [vectorStore, setVectorStore] = useState<SupabaseVectorStore>();
  const [isPreparingVectors, setIsPreparingVectors] = useState(false);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);

  const fileInputRef = useRef<HTMLDivElement | null>(null);
  const questionInputRef = useRef<HTMLTextAreaElement | null>(null);

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

      setVectorStore(vectorStore);
      setIsPreparingVectors(false);
    }
  };

  const handleSubmit = async () => {
    if (!vectorStore) return;

    setIsGeneratingResponse(true);

    setConversationHistory((prev) => [...prev, new HumanMessage(userInput)]);
    setUserInput("");
    if (questionInputRef.current) {
      questionInputRef.current.style.height = "36px";
    }

    const prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        `Answer the question based ONLY on the following context: {context}. Even if you can't find the answer in this context, don't search external information. Just say "I'm sorry. I can't find relevant information."`,
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

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    window.scrollTo({ top: window.innerHeight });
  }, [conversationHistory]);

  return (
    <div className="relative flex flex-col items-center gap-y-4 overflow-scroll ">
      <div className="flex w-full flex-col">
        {!vectorStore ? (
          !isPreparingVectors ? (
            <div
              className="flex flex-col gap-y-2 overflow-hidden"
              ref={fileInputRef}
            >
              <FileSelect
                files={files}
                setFiles={setFiles}
                acceptedFileCount={ACCEPTED_FILE_COUNT}
              />
              <div className="flex justify-center">
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    handleFileSubmit();
                  }}
                  disabled={
                    isPreparingVectors || files.length !== ACCEPTED_FILE_COUNT
                  }
                  className="w-full sm:w-auto"
                >
                  Send
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-y-8">
              <img src="/chatting.svg" className="h-auto w-96 animate-pulse" />
              <p>Wait a moment for our AI to be ready...</p>
            </div>
          )
        ) : (
          <div
            className="flex flex-col items-center gap-y-8"
            style={{
              animation: "2s linear fade-in",
            }}
          >
            <div className="flex max-w-[680px] items-center justify-between gap-x-2 rounded-sm bg-white px-12 py-6">
              <FaRegFilePdf className="text-destructive" size={20} />
              <div className="text-gray-900">{files[0].name}</div>
            </div>
            <div className="whitespace-pre text-center text-lg font-semibold">
              {`You are all set.`}
              <wbr />
              {` Let's start asking AI about the file!`}
            </div>
          </div>
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
        <div className="fixed bottom-0 flex w-screen flex-col items-center gap-y-4 bg-black px-2 pb-8 pt-2">
          {conversationHistory.length === 0 && (
            <FaAnglesDown
              size={64}
              className="animate-bounce cursor-pointer"
              onClick={() => {
                questionInputRef.current?.focus();
              }}
            />
          )}
          <form
            className="flex w-full max-w-[900px] flex-col gap-x-2 gap-y-2 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            <Textarea
              className="!min-h-0 resize-none border bg-white p-2 sm:flex-1"
              onChange={(e) => {
                setUserInput(e.target.value);
                if (questionInputRef.current) {
                  questionInputRef.current.style.height = "36px";
                  questionInputRef.current.style.height =
                    questionInputRef.current.scrollHeight + "px";
                }
              }}
              onKeyDown={handleKeyDown}
              value={userInput}
              placeholder="e.g., Teach me the summary of this file."
              ref={questionInputRef}
              rows={1}
            />
            <Button
              type="submit"
              className="flex items-center gap-x-1 rounded-lg px-4 py-2 text-white"
              disabled={isGeneratingResponse}
            >
              Send
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
