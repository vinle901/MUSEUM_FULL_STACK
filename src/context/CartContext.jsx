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

          if (existingItem) {
              return prevCart.map((cartItem) =>
                  cartItem.item_id === item.item_id
                      ? {...cartItem, quantity: cartItem.quantity + 1}
                      : cartItem
              )
          } else {
              return [...prevCart, {...item, quantity: 1}]
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
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0)
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