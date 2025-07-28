// import { useInfiniteQuery } from 'wagmi/query';
// import { fetchPaginatedTokens } from '../graphQl/fetchPaginatedTokens'; // ✅ use this

// const PAGE_SIZE = 50;

// export const usePaginatedTokens = (enabled: boolean) => {
//     return useInfiniteQuery({
//         queryKey: ['tokens'],
//         queryFn: async ({ pageParam = 0 }: any) => {
//             return await fetchPaginatedTokens(PAGE_SIZE, pageParam); // ✅ using the client
//         },
//         getNextPageParam: (lastPage, allPages) => {
//             // If last page returned fewer than PAGE_SIZE, no more pages
//             if (lastPage.tokenCreateds.length < PAGE_SIZE) return undefined;
//             return allPages.length * PAGE_SIZE;
//         },
//         initialPageParam: 0,
//         enabled: enabled,
//         refetchOnWindowFocus: false,
//         refetchOnReconnect: false,
//         retry: false,
//     });
// };
