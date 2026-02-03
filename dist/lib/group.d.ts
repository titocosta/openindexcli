export declare function nextKey(currentChainKey: Buffer): {
    messageKey: NonSharedBuffer;
    nextChainKey: NonSharedBuffer;
};
export declare function redistributeKeys(privateKey: string, groupId: string, members: string[]): Promise<void>;
//# sourceMappingURL=group.d.ts.map