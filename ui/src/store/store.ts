import {configureStore} from '@reduxjs/toolkit'
import commonReducer from "./CommonSlice";
import modalReducer from "../ModalSlice";
import elementReducer from "../ElementCreateSlice";

export const store = configureStore({
    reducer: {
        commonReducer,
        modalReducer,
        elementReducer
    },
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch