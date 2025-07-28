import { fetchAllTokenIds } from "../../hooks/useContractRead";

export const fetchTokenIds = async () => {
    try {
        const tokenIds: any = await fetchAllTokenIds();
        return tokenIds
    } catch (error: any) {
        console.warn("Error fetching token Ids", error.message);
        return []
    }
}
