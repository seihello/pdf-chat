import { Button } from "@/components/ui/button";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { FaCloudArrowUp, FaRegFilePdf, FaRegTrashCan } from "react-icons/fa6";

interface Props {
  files: File[];
  setFiles: (files: File[]) => void;
  acceptedFileCount: number;
}

export default function FileSelect({
  files,
  setFiles,
  acceptedFileCount,
}: Props) {
  const [alertMessage, setAlertMessage] = useState("");

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length >= 1) {
        if (files.length + acceptedFiles.length <= acceptedFileCount) {
          setFiles([...files, ...acceptedFiles]);
          setAlertMessage("");
        } else {
          setAlertMessage(`Please select ${acceptedFileCount} file(s) or less`);
        }
      }
    },
    [files, setFiles, acceptedFileCount],
  );

  const { getRootProps, getInputProps, open, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxSize: 30 * 1024 * 1024,
  });

  if (acceptedFileCount === 0) return;

  return (
    <div
      {...getRootProps()}
      className="flex w-full cursor-pointer flex-col items-center justify-center gap-y-4 rounded border-[3px] border-dotted bg-gray-50 p-44 px-4 py-6 font-normal text-gray-500 hover:bg-gray-100"
    >
      <FaCloudArrowUp size={64} />
      <input {...getInputProps()} />
      <div className="w-full text-center">
        Drag and drop <span className="font-bold">{acceptedFileCount} </span>{" "}
        PDF file
        {acceptedFileCount === 1 ? "" : "s"} here, or click to select
        {acceptedFileCount === 1 ? " a file" : " files"}.
      </div>
      <div className="flex flex-col items-center">
        <p>
          *Maximum file size is <b>30MB</b>.
        </p>
        <p>
          *We only accept a file written in <b>English</b>.
        </p>
      </div>
      {alertMessage.length > 0 && (
        <div className="text-destructive">{alertMessage}</div>
      )}
      {files.length > 0 && (
        <div className="flex w-full flex-col items-center gap-y-2">
          {files.map((file: File, index: number) => (
            <div
              key={index}
              className="flex w-full max-w-[480px] items-center justify-between gap-x-2 rounded-sm bg-white px-4 py-2"
            >
              <FaRegFilePdf size={20} className="text-destructive" />
              <div className="flex flex-1 shrink items-center gap-x-2 overflow-hidden text-ellipsis whitespace-nowrap text-gray-700">
                {file.name}
              </div>
              <Button
                variant="ghost"
                className="!min-w-0 p-0 hover:bg-none"
                onClick={(e) => {
                  e.stopPropagation();
                  const newFiles = [...files];
                  newFiles.splice(index, 1);
                  setFiles(newFiles);
                }}
              >
                <FaRegTrashCan size={20} />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
