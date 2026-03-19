import { PeraWalletConnect } from '@perawallet/connect'
import { DeflyWalletConnect } from '@blockshake/defly-connect'

const peraBtn = document.getElementById('peraBtn')
const deflyBtn = document.getElementById('deflyBtn')
const phantomBtn = document.getElementById('phantomBtn')
const disconnectBtn = document.getElementById('disconnectBtn')
const statusText = document.getElementById('statusText')
const walletAddress = document.getElementById('walletAddress')
const walletPanel = document.getElementById('walletPanel')
const helperText = document.getElementById('helperText')
const debugLog = document.getElementById('debugLog')
const clearDebugBtn = document.getElementById('clearDebugBtn')

const isFileProtocol = window.location.protocol === 'file:'
const peraWallet = new PeraWalletConnect({ chainId: 416002, compactMode: true })
const deflyWallet = new DeflyWalletConnect({ chainId: 416002 })

let activeWalletType = null
const logLines = []

const writeDebug = (message, details = null) => {
  const now = new Date().toLocaleTimeString()
  const line = details ? `[${now}] ${message}: ${details}` : `[${now}] ${message}`
  logLines.push(line)
  if (logLines.length > 120) logLines.shift()
  debugLog.textContent = logLines.join('\n')
  debugLog.scrollTop = debugLog.scrollHeight
}

connectBtn.disabled = true

const shortAddress = (address) => {
  if (!address || address.length < 18) return address
  return `${address.slice(0, 10)}...${address.slice(-8)}`
}

const setAllConnectButtons = (disabled) => {
  peraBtn.disabled = disabled
  deflyBtn.disabled = disabled
  phantomBtn.disabled = disabled
}

const setStatus = (message, type = 'default') => {
  statusText.textContent = message
  statusText.classList.remove('connected', 'error')
  if (type === 'connected') statusText.classList.add('connected')
  if (type === 'error') statusText.classList.add('error')
}

const setConnectedUI = (address, walletLabel) => {
  walletAddress.textContent = `${walletLabel}\n${shortAddress(address)}\n${address}`
  walletPanel.hidden = false
  disconnectBtn.hidden = false
  setStatus(`Connected: ${walletLabel}`, 'connected')
  helperText.textContent = `${walletLabel} session active.`
}

const setDisconnectedUI = () => {
  walletPanel.hidden = true
  disconnectBtn.hidden = true
  setStatus('Not connected')
  helperText.textContent = 'Click Pera/Defly to open QR modal, then scan with your mobile wallet.'
  activeWalletType = null
}

const showHowToScan = (walletLabel) => {
  helperText.textContent =
    `Open ${walletLabel} on your phone → tap the QR scanner → scan desktop QR → approve connection.`
}

const connectAlgorandWallet = async ({ walletType, walletLabel, walletClient }) => {
  writeDebug('Connect clicked', walletLabel)

  if (isFileProtocol) {
    setStatus('Open app with http://localhost (not file://)', 'error')
    helperText.textContent = 'Run local dev server: npm run dev, then open localhost URL and click Connect again.'
    writeDebug('Blocked', 'file:// protocol detected')
    return
  }

  setAllConnectButtons(true)
  setStatus(`Opening ${walletLabel} QR...`)
  showHowToScan(walletLabel)
  writeDebug('Opening QR modal', walletLabel)

  try {
    const accounts = await walletClient.connect()
    if (!accounts || accounts.length === 0) {
      setStatus('No account selected', 'error')
      writeDebug('Connect result', 'No accounts returned')
      return
    }
    walletClient.connector?.on('disconnect', setDisconnectedUI)
    activeWalletType = walletType
    writeDebug('Connected', accounts[0])
    setConnectedUI(accounts[0], walletLabel)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connection cancelled or failed'
    setStatus(message, 'error')
    helperText.textContent =
      `If no QR appears for ${walletLabel}, keep this tab focused and retry. Also allow popups/cookies for localhost.`
    writeDebug('Connect error', message)
  } finally {
    setAllConnectButtons(false)
  }
}

const connectPhantom = async () => {
  writeDebug('Connect clicked', 'Phantom')
  const phantomProvider = window?.phantom?.solana

  if (!phantomProvider?.isPhantom) {
    setStatus('Phantom extension not detected', 'error')
    helperText.textContent =
      'Phantom row is extension-based (not Algorand QR). Install Phantom browser extension if you want to use it.'
    writeDebug('Phantom unavailable', 'No extension provider found')
    return
  }

  try {
    setAllConnectButtons(true)
    setStatus('Connecting Phantom extension...')
    const response = await phantomProvider.connect()
    const address = response?.publicKey?.toString?.() || 'Connected'
    activeWalletType = 'phantom'
    setConnectedUI(address, 'Phantom')
    writeDebug('Connected', address)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Phantom connection failed'
    setStatus(message, 'error')
    writeDebug('Connect error', message)
  } finally {
    setAllConnectButtons(false)
  }
}

const disconnectWallet = async () => {
  writeDebug('Disconnect clicked')

  try {
    if (activeWalletType === 'pera') {
      await peraWallet.disconnect()
    } else if (activeWalletType === 'defly') {
      await deflyWallet.disconnect()
    } else if (activeWalletType === 'phantom') {
      const phantomProvider = window?.phantom?.solana
      if (phantomProvider?.disconnect) {
        await phantomProvider.disconnect()
      }
    }
    writeDebug('Disconnected', 'Session cleared')
  } catch {
    setStatus('Disconnected locally', 'error')
    writeDebug('Disconnect warning', 'Could not clear remote session')
  }
  setDisconnectedUI()
}

const init = async () => {
  writeDebug('App init')

  if (isFileProtocol) {
    setStatus('Open app via localhost', 'error')
    helperText.textContent = 'Wallet QR requires localhost. Run npm run dev and open the shown URL.'
    writeDebug('Init blocked', 'file:// protocol detected')
    return
  }

  setStatus('Ready to connect')
  helperText.textContent = 'Select a wallet row. Pera/Defly open QR. Phantom uses extension.'

  try {
    const peraSessions = await peraWallet.reconnectSession()
    writeDebug('Pera reconnect checked', `${peraSessions?.length ?? 0} account(s) found`)
    if (peraSessions && peraSessions.length > 0) {
      activeWalletType = 'pera'
      peraWallet.connector?.on('disconnect', setDisconnectedUI)
      setConnectedUI(peraSessions[0], 'Pera Wallet')
      writeDebug('Session restored', peraSessions[0])
      return
    }

    const deflySessions = await deflyWallet.reconnectSession()
    writeDebug('Defly reconnect checked', `${deflySessions?.length ?? 0} account(s) found`)
    if (deflySessions && deflySessions.length > 0) {
      activeWalletType = 'defly'
      deflyWallet.connector?.on('disconnect', setDisconnectedUI)
      setConnectedUI(deflySessions[0], 'Defly Wallet')
      writeDebug('Session restored', deflySessions[0])
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Wallet initialization failed'
    setStatus(message, 'error')
    writeDebug('Init error', message)
  }
}

peraBtn.addEventListener('click', () =>
  connectAlgorandWallet({
    walletType: 'pera',
    walletLabel: 'Pera Wallet',
    walletClient: peraWallet,
  }),
)

deflyBtn.addEventListener('click', () =>
  connectAlgorandWallet({
    walletType: 'defly',
    walletLabel: 'Defly Wallet',
    walletClient: deflyWallet,
  }),
)

phantomBtn.addEventListener('click', connectPhantom)
disconnectBtn.addEventListener('click', disconnectWallet)
clearDebugBtn.addEventListener('click', () => {
  logLines.length = 0
  debugLog.textContent = 'No logs yet.'
})

init()