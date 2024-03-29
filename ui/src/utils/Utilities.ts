import {lazy} from "react";

export const isLocalhost = Boolean(
    window.location.hostname === 'localhost' ||
    // [::1] is the IPv6 localhost address.
    window.location.hostname === '[::1]' ||
    // 127.0.0.0/8 are considered localhost for IPv4.
    window.location.hostname.match(
        /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
    )
);


export const fixLinkProtocol = (link:string)=>{
    let replacedLink = link.substring(0,link.indexOf('{'))
    return window.location.protocol+replacedLink.substring(replacedLink.indexOf(":")+1,replacedLink.length)
}

export const fixProtocol = (link:string)=>{
    return window.location.protocol+link.substring(link.indexOf(":")+1,link.length)
}