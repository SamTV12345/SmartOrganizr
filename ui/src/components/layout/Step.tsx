import React, {FC, ReactNode} from "react";

export type StepProps = {
    children: any
}

export const Step: FC<StepProps> = ({children})=>{
    return <div>
        {children}
    </div>
}