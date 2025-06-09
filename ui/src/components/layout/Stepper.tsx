import {createContext, FC, useMemo, useState} from "react";
import {CheckIcon, Circle, CircleCheck, CircleCheckIcon} from "lucide-react";
import {Button} from "@/components/ui/button";
import {useTranslation} from "react-i18next";


type StepperContext = {
    onIncrement: () => void,
    onDecrement: () => void,

}

type StepperProps = {
    children: React.ReactNode[]

}

export const StepperContext = createContext<StepperContext>(null as any)


export const Stepper: FC<StepperProps> = ({children}) => {
    const [currentStep, setCurrentStep] = useState(0)
    const currentStepper = useMemo(()=>{
        return children[currentStep]
    }, [currentStep])
    const {t} = useTranslation()


    return <StepperContext.Provider value={{
        onDecrement: () => setCurrentStep(currentStep - 1),
        onIncrement: () => setCurrentStep(currentStep + 1)
    }}>
        <div className="flex">
            {
                children.map((_, i) => {
                    return <div key={i} className="flex-grow self-center">
                        <span className="rounded-full bg-blue-700">
                    {i < currentStep ? <CircleCheckIcon/> : <CircleCheck/>}
                    </span></div>
                })
            }

        </div>
        <div className="bg-gray-50 mt-5 p-2 rounded">
            {
                currentStepper
            }
            <p className="float-right mt-5 flex gap-5">
                {currentStep > 0 && <Button variant="secondary" onClick={()=>setCurrentStep(currentStep - 1)}>{t('cancel')}</Button>}
                {currentStep < children.length && <Button  onClick={()=>setCurrentStep(currentStep + 1)}>{t('continue')}</Button> }
                {currentStep === children.length && <Button>{t('save')}</Button> }
            </p>
        </div>

    </StepperContext.Provider>
}