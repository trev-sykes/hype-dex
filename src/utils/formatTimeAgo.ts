export function timeAgo(timestamp: any) {
    const now = Date.now();
    const secondsAgo = Math.floor((now - timestamp * 1000) / 1000);

    const minutes = Math.floor(secondsAgo / 60);
    const hours = Math.floor(secondsAgo / 3600);
    const days = Math.floor(secondsAgo / 86400);
    const months = Math.floor(secondsAgo / (86400 * 30));

    if (secondsAgo < 60) {
        return `${secondsAgo} seconds ago`;
    } else if (minutes < 60) {
        return `${minutes} minutes ${secondsAgo % 60}s ago`;
    } else if (hours < 24) {
        return `${hours}h ${minutes % 60}m ago`;
    } else if (days < 30) {
        return `${days}d ${hours % 24}h ago`;
    } else {
        return `${months}m ${days % 30}d ago`;
    }
}
