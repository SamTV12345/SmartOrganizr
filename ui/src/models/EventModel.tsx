import {Check, Circle, X ,ShieldQuestionIcon} from "lucide-react";

export type EventModel = {
    uid: string
    summary: string
    url: string
    geoDateX?:number
    geoDateY?:number
    location?: string
    tzId?: string
    description?: string
    startDate?: string
    endDate?: string
    status: StatusModel
}

export enum StatusModel {
    Ok, Deny, Maybe, NotYetDecided
}

export const convertStatusModelToIcon = (status: StatusModel)=>{
    switch (status) {
        case StatusModel.Ok:
            return <Check className="text-green-700"/>
        case StatusModel.Deny:
            return <X className="text-red-600"/>
        case StatusModel.Maybe:
            return <Circle className="text-yellow-500"/>
        case StatusModel.NotYetDecided:
            return <ShieldQuestionIcon/>
    }
}
