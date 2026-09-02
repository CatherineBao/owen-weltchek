import { motion } from 'framer-motion'

function App() {
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <h1>Owen Weltchek</h1>
    </motion.main>
  )
}

export default App
