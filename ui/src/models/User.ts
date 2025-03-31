export interface User {
    userId: string,
    selectedTheme: string,
    sideBarCollapsed: boolean
    profilePicUrl: string
    username: string,
    firstname: string,
    lastname: string,
    email: string,
    telephoneNumber?: string,
}

export interface UserPatchDto {
    username: string,
    firstname: string,
    lastname: string,
    email: string,
    telephoneNumber?: string,
}
