import { fetchTokenMetadataRange } from "../../hooks/useContractRead";
import { fetchTokenIds } from "./fetchTokenIds";
// Grabs metadata from contract returns array of update
export const fetchMetaDataFromBlockchain = async (
    start: number = 0,
    end?: number
): Promise<any> => {
    try {
        // is no end arg is given, we fetch the tokens length from blockchain
        const finalEnd = end ?? (await fetchTokenIds()).length;
        return await fetchTokenMetadataRange(start, finalEnd);
    } catch (err: any) {
        console.error(err.message || err);
        return [];
    }
};
