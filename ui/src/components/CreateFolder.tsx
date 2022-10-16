import {useAppDispatch, useAppSelector} from "../store/hooks";
import {setElementDescription, setElementName} from "../ElementCreateSlice";

export const CreateFolder = ()=>{
    const name = useAppSelector(state => state.elementReducer.name)
    const parent = useAppSelector(state=>state.elementReducer.parent)
    const description = useAppSelector(state=>state.elementReducer.description)
    const dispatch = useAppDispatch()

    return <div className="col-span-2  grid grid-cols-2 gap-5">
        <div className="border-b border-gray-60 w-full col-span-2"/>
            <h2 className="text-2xl col-span-2">Ordner erstellen</h2>

            <div>
                Name
            </div>
            <input value={name} onChange={(v)=>dispatch(setElementName(v.target.value))}/>

            <div>
                Beschreibung
            </div>
            <input value={description} onChange={(v)=>dispatch(setElementDescription(v.target.value))}/>

    </div>
}