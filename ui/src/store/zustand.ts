import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import {Author} from "@/src/models/Author";


interface BearState {
    selectedAuthor: Author|undefined
}

export const useAPIStore = create<BearState>()((set) => ({
    selectedAuthor: undefined
}))
