import { PeraWalletConnect } from '@perawallet/connect'

const connectBtn = document.getElementById('connectBtn')
const disconnectBtn = document.getElementById('disconnectBtn')
const statusText = document.getElementById('statusText')
const walletAddress = document.getElementById('walletAddress')
const walletPanel = document.getElementById('walletPanel')
const helperText = document.getElementById('helperText')

const isFileProtocol = window.location.protocol === 'file:'
let peraWallet = null
let sdkReady = false

connectBtn.disabled = true

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

const ensureWalletReady = async () => {
  if (sdkReady && peraWallet) return

  setStatus('Loading wallet SDK...')
  helperText.textContent = 'Preparing secure WalletConnect session...'

  peraWallet = new PeraWalletConnect({
    chainId: 416002,
    compactMode: true,
  })
  sdkReady = true
}

const connectWallet = async () => {
  if (isFileProtocol) {
    setStatus('Open app with http://localhost (not file://)', 'error')
    helperText.textContent = 'Run a local server: npx serve . then open the shown localhost URL and click Connect again.'
    return
  }

  if (!sdkReady || !peraWallet) {
    setStatus('Wallet SDK still loading...', 'error')
    helperText.textContent = 'Please wait 1-2 seconds and click Connect again.'
    return
  }

  connectBtn.disabled = true
  setStatus('Waiting for wallet approval...')
  showHowToScan()
  try {
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
  if (!peraWallet) {
    setDisconnectedUI()
    return
  }

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
    await ensureWalletReady()
    connectBtn.disabled = false

    const sessions = await peraWallet.reconnectSession()
    if (sessions && sessions.length > 0) {
      peraWallet.connector?.on('disconnect', setDisconnectedUI)
      setConnectedUI(sessions[0])
      return
    }
    setStatus('Ready to connect')
    helperText.textContent = 'Click Connect with QR. If modal does not appear, refresh once and try again.'
  } catch {
    setStatus('Wallet SDK failed to load', 'error')
    helperText.textContent =
      'Please run via npm dev server so dependencies are bundled locally. Use: npm install, then npm run dev.'
  }

  if (!walletPanel.hidden) return
  disconnectBtn.hidden = true
}

connectBtn.addEventListener('click', connectWallet)
disconnectBtn.addEventListener('click', disconnectWallet)

init()