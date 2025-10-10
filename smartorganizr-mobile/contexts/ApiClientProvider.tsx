import {ApiClient} from "@/api/ApiClient";
import {createContext, useContext} from "react";

export const ApiClientContext = createContext<ApiClient | null>(null);

export const useApiClient = () => {
    const ctx = useContext(ApiClientContext);
    if (!ctx) throw new Error("ApiClientContext not found");
    return ctx;
};

export const ApiClientProvider: React.FC<{ client: ApiClient, children: React.ReactNode }> = ({ client, children }) => (
    <ApiClientContext.Provider value={client}>
        {children}
        </ApiClientContext.Provider>
);
