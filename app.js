import { PeraWalletConnect } from 'https://cdn.jsdelivr.net/npm/@perawallet/connect@1.5.1/dist/index.js'

const connectBtn = document.getElementById('connectBtn')
const disconnectBtn = document.getElementById('disconnectBtn')
const statusText = document.getElementById('statusText')
const walletAddress = document.getElementById('walletAddress')
const walletPanel = document.getElementById('walletPanel')
const helperText = document.getElementById('helperText')

const peraWallet = new PeraWalletConnect({
  chainId: 416002,
  compactMode: true,
})
const isFileProtocol = window.location.protocol === 'file:'

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

const showHowToScan = () => {
  helperText.textContent =
    'Open Pera Wallet on your phone → tap the QR scanner icon (top right) → scan the QR shown on desktop → approve connection.'
}

const connectWallet = async () => {
  if (isFileProtocol) {
    setStatus('Open app with http://localhost (not file://)', 'error')
    helperText.textContent = 'Run a local server: npx serve . then open the shown localhost URL and click Connect again.'
    return
  }

  connectBtn.disabled = true
  setStatus('Waiting for wallet approval...')
  showHowToScan()
  try {
    if (!peraWallet.isConnected && peraWallet.connector) {
      await peraWallet.disconnect()
    }

    const accounts = await peraWallet.connect()
    if (!accounts || accounts.length === 0) {
      setStatus('No account selected', 'error')
      return
    }
    peraWallet.connector?.on('disconnect', setDisconnectedUI)
    setConnectedUI(accounts[0])
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connection cancelled or failed'
    setStatus(message, 'error')
    helperText.textContent =
      'If no QR appears, disable popup/ad blockers for this site and retry from localhost. Then scan using Pera QR scanner.'
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
  if (isFileProtocol) {
    setStatus('Local file mode detected', 'error')
    helperText.textContent = 'WalletConnect QR may fail on file://. Start a local server: npx serve . and open localhost URL.'
    return
  }

  try {
    const sessions = await peraWallet.reconnectSession()
    if (sessions && sessions.length > 0) {
      peraWallet.connector?.on('disconnect', setDisconnectedUI)
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