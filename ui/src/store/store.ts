import {configureStore} from '@reduxjs/toolkit'
import commonReducer from "./CommonSlice";
import modalReducer from "../ModalSlice";

export const store = configureStore({
    reducer: {
        commonReducer,
        modalReducer
    },
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch