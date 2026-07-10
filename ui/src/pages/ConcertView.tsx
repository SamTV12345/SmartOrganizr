import {Fragment} from "react";
import {$api} from "@/src/api/client";
import {useAppDispatch} from "../store/hooks";
import {ConcertYear} from "../components/ConcertYear";
import {ConcertItem} from "../components/ConcertItem";
import {setOpenAddModal} from "../ModalSlice";
import {AddConcertModal} from "../components/modals/AddConcertModal";
import {PlusIcon} from "../components/form/PlusIcon";

export const ConcertView = () => {
    const dispatch = useAppDispatch()
    const {data: concerts} = $api.useQuery("get", "/v1/concerts")
    let currentYear = 0

    return <div className="md:ml-8 mt-4 md:mr-4">
        <AddConcertModal/>
        <PlusIcon onClick={() => dispatch(setOpenAddModal(true))}/>
        {(concerts ?? []).map((c) => {
            const year = new Date(c.dueDate).getFullYear()
            const showYearHeading = year !== currentYear
            currentYear = year
            return <Fragment key={c.id}>
                {showYearHeading && <ConcertYear year={year} keyNum={c.id + "year"}/>}
                <ConcertItem concert={c} keyNum={c.id}/>
            </Fragment>
        })}
    </div>
}
