import React from "react";

function MarketsHeader() {
  return (
    <div className="flex justify-between text-gray-400 mb-4 w-full px-4">
      <p className="w-1/5">Name</p>
      <p className="w-1/5 text-right">Price</p>
      <p className="w-1/5 text-right">24h Volume</p>
      <p className="w-1/5 text-right">Market Cap</p>
      <p className="w-1/5 text-right">24h Change</p>
    </div>
  );
}

export default MarketsHeader;
