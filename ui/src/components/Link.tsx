import React, {FC} from "react";

type LinkProps = {
    href: string,
    children: React.ReactNode
}


export const Link: FC<LinkProps> = ({
    children,
    href
                                    })=>{
    return <a className="inline hover:underline decoration-white" href={href}>{children}</a>
}