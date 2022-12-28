import {setOpenAddModal} from "../../ModalSlice";
import {FC} from "react";

type PlusIconProp = {
    onClick: () => void
}

export const PlusIcon:FC<PlusIconProp> = ({onClick})=>{
    return <div className="flex justify-end mr-5 mt-5 mb-5">
        <button data-modal-toggle="defaultModal" type="button" className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center bg-blue-600 hover:bg-blue-700 focus:ring-blue-800"
                onClick={onClick}>
            <i className="fa-solid fa-plus"/>
        </button>
    </div>
}