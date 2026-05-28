export type PinboardPost = {
    id: string;
    clubId: string;
    clubName: string;
    authorId: string;
    authorName: string;
    title: string;
    body: string;
    pinned: boolean;
    createdAt: string;
    updatedAt: string;
};

export type PinboardPostUpsert = {
    title: string;
    body: string;
    pinned: boolean;
};
