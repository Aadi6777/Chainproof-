// Using Global Ethers from CDN to prevent bundler conflicts
const getEthers = () => {
  if (!window.ethers) {
    throw new Error("Ethers library not loaded. Please check your internet connection.");
  }
  return window.ethers;
};

const CONTRACT_ABI = [
  "function createShipment(string memory _shipmentId, string memory _goodsType) public",
  "function logHandoff(string memory _shipmentId, string memory _location, int256 _temperature, string memory _documentHash, string memory _signature) public",
  "function approveHandoff(string memory _shipmentId, uint256 _index, bool _isManager) public",
  "function getShipment(string memory _shipmentId) public view returns (string memory goodsType, uint256 timestamp, address producer, uint256 handoffCount)",
  "function getHandoff(string memory _shipmentId, uint256 _index) public view returns (string memory location, int256 temperature, string memory documentHash, bool managerApproved, bool consumerApproved)"
];

// Use the contract address from your Remix deployment
const CONTRACT_ADDRESS = "0x95698081d099875d3EC0d855aC2eBc63fe1d3bf2"; 

export const getBlockchainContract = async () => {
  const ethers = getEthers();
  
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed. Please install it to use blockchain features.");
  }

  // Explicitly request account access
  await window.ethereum.request({ method: 'eth_requestAccounts' });

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
};

export const anchorShipmentOnChain = async (data) => {
  try {
    const contract = await getBlockchainContract();
    console.log("Anchoring shipment on-chain:", data.shipmentId);
    
    // Updated to match new 2-argument ABI
    const tx = await contract.createShipment(
      data.shipmentId,
      data.goodsType
    );
    
    console.log("Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("Transaction confirmed:", receipt.hash);
    return receipt.hash;
  } catch (err) {
    console.error("Blockchain anchoring failed:", err);
    throw err;
  }
};

export const anchorHandoffOnChain = async (shipmentId, locationName, temperature, documentHash, signature) => {
  try {
    const contract = await getBlockchainContract();
    console.log(`Anchoring handoff for ${shipmentId} at ${locationName}...`);
    
    // Updated to match new 5-argument ABI
    const tx = await contract.logHandoff(
      shipmentId,
      locationName,
      Math.round(parseFloat(temperature) * 10), // Store with 1 decimal precision
      documentHash,
      signature
    );
    
    console.log("Handoff transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("Handoff transaction confirmed:", receipt.hash);
    return receipt.hash;
  } catch (err) {
    console.error("Blockchain handoff anchoring failed:", err);
    throw err;
  }
};

export async function createShipmentOnChain(shipmentId, goodsType) {
  return anchorShipmentOnChain({ shipmentId, goodsType });
}

export async function logHandoffOnChain(shipmentId, location, temperature, documentHash, signature) {
  return anchorHandoffOnChain(shipmentId, location, temperature, documentHash, signature);
}

export async function approveHandoffOnChain(shipmentId, handoffIndex, isManager) {
  const contract = await getBlockchainContract();
  const tx = await contract.approveHandoff(shipmentId, handoffIndex, isManager);
  await tx.wait();
  return tx.hash;
}

export const verifyShipmentOnChain = async (shipmentId) => {
  try {
    const contract = await getBlockchainContract();
    const result = await contract.getShipment(shipmentId);
    
    return {
      exists: true,
      goodsType: result.goodsType,
      handoffCount: Number(result.handoffCount)
    };
  } catch (err) {
    console.error("Blockchain verification failed:", err);
    return { exists: false };
  }
};
