export type Club = {
    id: string;
    name: string;
    addressId: string
    club_type: string;
    street: string;
    house_number: string;
    location: string;
    postal_code: string;
    country: string;
    dates_visible_for_all_members: boolean;
    members_can_send_messages: boolean;
    feedback_visibility: string;
    reason_visibility: string;
}
