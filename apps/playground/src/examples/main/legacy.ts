// Legacy Code Example - TypeScript exercises
// Demonstrating how to modernize legacy JavaScript code

// Legacy JavaScript-style code (commented out)
/*
function calculateTotal(items) {
  var total = 0;
  for (var i = 0; i < items.length; i++) {
    total += items[i].price * items[i].quantity;
  }
  return total;
}
*/

// Modern TypeScript version
interface Item {
  price: number
  quantity: number
  name: string
}

function calculateTotal(items: Item[]): number {
  return items.reduce((total, item) => total + item.price * item.quantity, 0)
}

// Legacy callback-style code modernization
// Old: callback-based
function legacyFetchData(callback: (error: any, data?: any) => void) {
  setTimeout(() => {
    callback(null, { message: 'Data fetched' })
  }, 1000)
}

// Modern: Promise-based
function modernFetchData(): Promise<{ message: string }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ message: 'Data fetched' })
    }, 1000)
  })
}

// Usage examples
const items: Item[] = [
  { name: 'Apple', price: 1.5, quantity: 3 },
  { name: 'Banana', price: 0.75, quantity: 5 },
]

const total = calculateTotal(items)
console.log('Total:', total)

// Modern async/await usage
async function fetchAndProcess() {
  try {
    const data = await modernFetchData()
    console.log('Received:', data.message)
  } catch (error) {
    console.error('Error:', error)
  }
}

fetchAndProcess()
