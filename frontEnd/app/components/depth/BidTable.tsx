
export const BidTable = ({ bids }: {bids: [string, string][]}) => {
    let currentTotal = 0; 
    const relevantBids = bids.slice(0, 15);
    const bidsWithTotal: [string, string, number][] = relevantBids.map(([price, quantity]) => [price, quantity, currentTotal += Number(quantity)]);
    const maxTotal = relevantBids.reduce((acc, [_, quantity]) => acc + Number(quantity), 0);

    return <div className="h-fit">
        {bidsWithTotal?.map(([price, quantity, total]) => <Bid maxTotal={maxTotal} total={total} key={price} price={price} quantity={quantity} noOfBits={bids.length} />)}
    </div>
}

function Bid({ price, quantity, total, maxTotal,noOfBits }: { price: string, quantity: string, total: number, maxTotal: number, noOfBits:number }) {
    return (
        <div
            style={{
                display: "flex",
                position: "relative",
                width: "100%", 
                height: `${(100 / Math.min(noOfBits,15))}%`,
                backgroundColor: "transparent",
                overflow: "hidden",
            }}
        >
        <div
            style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: `${(100 * total) / maxTotal}%`,
            height: "100%",
            background: "rgba(1, 167, 129, 0.325)",
            transition: "width 0.3s ease-in-out",
            }}
        ></div>
            <div className={`flex justify-between text-xs w-full py-1 px-1`}>
                <div>
                    {price}
                </div>
                <div>
                    {quantity}
                </div>
                <div>
                    {total.toFixed(2)}
                </div>
            </div>
        </div>
    );
}
