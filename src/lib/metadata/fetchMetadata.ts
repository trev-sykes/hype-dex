import { fetchTokenMetadataRange } from "../../hooks/useContractRead";

export const fetchMetaDataFromBlockchain: any = async (start = 0, end: any) => {
    try {
        return await fetchTokenMetadataRange(start, end);
    } catch (err: any) {
        console.error(err.message);
        return []
    }
}