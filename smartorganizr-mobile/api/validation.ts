import * as z from "zod";


/*
    clientId : string,
    url: string
    realm: string
    links: Record<string, Href>
 */
export const ConfigModelValidation = z.object({
    clientId: z.string().min(1),
    url: z.string().url(),
    realm: z.string().min(1),
    _links: z.record(z.object({
        href: z.string().url()
    }))
})

export const DiscoveryDocumentValidation = z.object({
    authorizationEndpoint: z.string().url(),
    tokenEndpoint: z.string().url(),
    revocationEndpoint: z.string().url().optional(),
})
