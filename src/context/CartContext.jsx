// File: src/context/CartContext.jsx

import { createContext, useContext, useState } from 'react'

const CartContext = createContext()

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([])

  const addToCart = (item) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((cartItem) => cartItem.item_id === item.item_id)

      // Ensure price is stored as a number (convert from string if needed)
      const itemWithNumericPrice = {
        ...item,
        price: typeof item.price === 'string' ? parseFloat(item.price) : item.price
      }

      if (existingItem) {
        return prevCart.map((cartItem) =>
          cartItem.item_id === item.item_id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        )
      } else {
        return [...prevCart, { ...itemWithNumericPrice, quantity: 1 }]
      }
    })
  }

  const removeFromCart = (itemId) => {
    setCart((prevCart) => prevCart.filter((item) => item.item_id !== itemId))
  }

  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(itemId)
      return
    }
    
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.item_id === itemId
          ? { ...item, quantity: Math.min(newQuantity, item.stock_quantity) }
          : item
      )
    )
  }

  const clearCart = () => {
    setCart([])
  }

  const getCartTotal = () => {
    const total = cart.reduce((sum, item) => {
      // Ensure price is a number for calculation
      const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price
      const itemTotal = price * item.quantity
      
      // Debug logging to catch $0.00 issues
      if (isNaN(itemTotal)) {
        console.warn('Invalid price calculation for item:', item)
        return sum
      }
      
      return sum + itemTotal
    }, 0)

    return total
  }

  const getCartItemCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0)
  }

  const value = {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getCartItemCount
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}