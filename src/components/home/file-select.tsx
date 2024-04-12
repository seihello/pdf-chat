import { Button } from "@/components/ui/button";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { FaCloudArrowUp, FaRegTrashCan } from "react-icons/fa6";

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
        Drag and drop up to{" "}
        <span className="font-bold">{acceptedFileCount} </span> PDF file
        {acceptedFileCount === 1 ? "" : "s"} here, or click to select file
        {acceptedFileCount === 1 ? "" : "s"}.
      </div>
      <div>
        Maximum file size: <b>30MB</b>
      </div>
      {alertMessage.length > 0 && (
        <div className="text-destructive">{alertMessage}</div>
      )}
      {files.length > 0 && (
        <div className="flex flex-col gap-y-2">
          {files.map((file: File, index: number) => (
            <div
              key={index}
              className="flex w-[640px] items-center justify-between gap-x-2 rounded-sm bg-white px-4 py-2"
            >
              <div className="flex items-center gap-x-2 whitespace-nowrap">
                <div className="max-w-[480px] flex-1 overflow-hidden text-ellipsis text-gray-700">
                  {file.name}
                </div>
              </div>
              <Button
                variant="ghost"
                className="p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  const newFiles = [...files];
                  newFiles.splice(index, 1);
                  setFiles(newFiles);
                }}
              >
                <FaRegTrashCan size={16} />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
