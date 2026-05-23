import * as z from "zod";

export const ConfigModelValidation = z.object({
    clientId: z.string().min(1),
    url: z.url(),
    realm: z.string().min(1),
})

export const DiscoveryDocumentValidation = z.object({
    authorizationEndpoint: z.url(),
    tokenEndpoint: z.url(),
    revocationEndpoint: z.url().optional(),
})
