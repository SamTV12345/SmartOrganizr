import {createPortal} from "react-dom";
import {useAppDispatch, useAppSelector} from "../../store/hooks";
import {FC, useEffect, useRef, useState} from "react";
import {setNotePDFUploadOpen, setOpenAddModal} from "../../ModalSlice";
import {Trans, useTranslation} from "react-i18next";
import axios from "axios";
import {apiURL} from "../../Keycloak";

type FileUploadModalProps = {

}

type MyFile = {
    name: string,
    content: string
}
type DragState = "none" | "allowed" | "invalid"

export const FileUploadModal:FC<FileUploadModalProps> = () => {
    const dispatch = useAppDispatch()
    const {t} = useTranslation()
    const openModal = useAppSelector(state => state.modalReducer.openNotePDFUpload)
    const selectedNote = useAppSelector(state=>state.modalReducer.selectedFolder)
    const [files, setFiles] = useState<MyFile[]>([])
    const [dragState, setDragState] = useState<DragState>("none")
    const fileInputRef = useRef<HTMLInputElement>(null)

    const readFile = (file: File) => {
        return new Promise<MyFile>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve({
                name: file.name,
                content: reader.result as string
            });
            reader.onerror = reject;
            reader.readAsDataURL(file);
        })
    }

    const uploadFiles = (files: FileList) => {
        const filesArray: MyFile[] = []
        for (const f of files) {
            const res = readFile(f)
            res.then(c=>{
                    if(c!==null) {
                        filesArray.push(c)
                    }
                    setFiles(filesArray)
                    })
        }
    }

    const handleInputChanged = (e: any) => {
        uploadFiles(e.target.files)
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "copy"
    }

    useEffect(()=>{
        if(files.length>0){
            console.log("Test")
        }
    },[files])

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()


        const fileList: MyFile[] = []
        for (const f of e.dataTransfer.files) {
            const res = readFile(f)
            if(res==null){
                break
            }
            res.then(c=>{
                if(c!==null) {
                    fileList.push(c)
                }
            })
        }

        setFiles(fileList)

        setDragState("none")
    }

    const uploadFilesToBackend = (f:string)=>{
        if(selectedNote===undefined){
            return
        }
        axios.post(apiURL+`/v1/elements/${selectedNote.id}/pdf`, f)
            .then(res=>{
                console.log(res)
            })
    }

    return openModal ? createPortal (

            <div id="defaultModal" onClick={()=>dispatch(setNotePDFUploadOpen(false))} tabIndex={-1} aria-hidden="true" className="overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 w-full md:inset-0 h-modal md:h-full z-40">
                <div className="grid place-items-center h-screen">
                    <div className="relative rounded-lg shadow bg-gray-700 justify-center w-full md:w-2/4" onClick={e=>e.stopPropagation()}>
                        <div className="flex justify-between items-start p-4 rounded-t border-b border-gray-600">
                            <h3 className="text-xl font-semibold text-white">
                                <Trans>upload-pdf</Trans>
                            </h3>
                            <button type="button" className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center hover:bg-gray-600 hover:text-white" data-modal-toggle="defaultModal" onClick={()=>dispatch(setNotePDFUploadOpen(false))}>
                                <svg aria-hidden="true" className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
                                <span className="sr-only">{t('closeModal')}</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-6 text-base leading-relaxed text-gray-400">
                            <div className="flex items-center justify-center w-full md:w-50"
                                 onDragEnter={() => setDragState("allowed")}
                                 onDragLeave={() => setDragState("none")}
                                 onDragOver={handleDragOver} onDrop={handleDrop}>
                                <label htmlFor="dropzone-file"
                                       className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <svg aria-hidden="true" className="w-10 h-10 mb-3 text-gray-400" fill="none" stroke="currentColor"
                                             viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                                        </svg>
                                        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                                            <Trans>click-or-upload</Trans>
                                        </p>
                                        {files.map((f, i) => {

                                            return <span key={i} className="mb-2 text-sm text-white">{f.name}</span>
                                        })}
                                    </div>
                                    <input id="dropzone-file" ref={fileInputRef} type="file" className="hidden" onChange={handleInputChanged} accept=".pdf"/>
                                </label>
                            </div>
                        </div>
                        <div className="flex items-center p-6 space-x-2 rounded-b border-t border-gray-200 border-gray-600">
                            <button data-modal-toggle="defaultModal" type="button" className="text-gray-500 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10 bg-gray-700 text-gray-300 border-gray-500 hover:text-white hover:bg-gray-600 focus:ring-gray-600"
                                    onClick={()=>dispatch(setNotePDFUploadOpen(false))}>{t('cancel')}</button>
                            <button data-modal-toggle="defaultModal" type="button" className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center bg-blue-600 hover:bg-blue-700 focus:ring-blue-800" onClick={()=>{
                                files.forEach(f=>{
                                    uploadFilesToBackend(f.content)
                                })
                                dispatch(setNotePDFUploadOpen(false))
                            }}>{t('send')}</button>
                        </div>
                    </div>
                </div>
            </div>, document.getElementById('modal') as HTMLElement):<div></div>
}
