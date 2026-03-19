import PeraWalletConnect from 'https://esm.sh/@perawallet/connect@1.4.2'

const connectBtn = document.getElementById('connectBtn')
const disconnectBtn = document.getElementById('disconnectBtn')
const statusText = document.getElementById('statusText')
const walletAddress = document.getElementById('walletAddress')
const walletPanel = document.getElementById('walletPanel')
const helperText = document.getElementById('helperText')

const peraWallet = new PeraWalletConnect()

const shortAddress = (address) => `${address.slice(0, 10)}...${address.slice(-8)}`

const setStatus = (message, type = 'default') => {
  statusText.textContent = message
  statusText.classList.remove('connected', 'error')
  if (type === 'connected') statusText.classList.add('connected')
  if (type === 'error') statusText.classList.add('error')
}

const setConnectedUI = (address) => {
  walletAddress.textContent = `${shortAddress(address)}\n${address}`
  walletPanel.hidden = false
  disconnectBtn.hidden = false
  setStatus('Connected', 'connected')
  helperText.textContent = 'Wallet session active. You can now sign transactions from this dApp.'
}

const setDisconnectedUI = () => {
  walletPanel.hidden = true
  disconnectBtn.hidden = true
  setStatus('Not connected')
  helperText.textContent = 'Clicking connect opens the WalletConnect QR modal. Approve in your mobile wallet.'
}

const connectWallet = async () => {
  connectBtn.disabled = true
  setStatus('Waiting for wallet approval...')
  helperText.textContent = 'If you are on desktop, scan the QR code with Pera Wallet.'
  try {
    const accounts = await peraWallet.connect()
    if (!accounts || accounts.length === 0) {
      setStatus('No account selected', 'error')
      return
    }
    setConnectedUI(accounts[0])
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connection cancelled or failed'
    setStatus(message, 'error')
    helperText.textContent = 'Please try connecting again and approve the session in wallet.'
  } finally {
    connectBtn.disabled = false
  }
}

const disconnectWallet = async () => {
  try {
    await peraWallet.disconnect()
  } catch {
    setStatus('Disconnected locally', 'error')
  }
  setDisconnectedUI()
}

const init = async () => {
  try {
    const sessions = await peraWallet.reconnectSession()
    if (sessions && sessions.length > 0) {
      setConnectedUI(sessions[0])
      return
    }
  } catch {
    setStatus('Session check failed', 'error')
  }
  setDisconnectedUI()
}

connectBtn.addEventListener('click', connectWallet)
disconnectBtn.addEventListener('click', disconnectWallet)

init()