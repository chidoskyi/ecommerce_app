import { combineReducers } from "@reduxjs/toolkit";
import addressReducer from "./slices/addressSlice";
import cartReducer from "./slices/cartSlice";
import productReducer from "./slices/productSlice";
import categoryReducer from "./slices/categorySlice";
import wishlistReducer from "./slices/wishlistSlice";
import checkoutReducer from "./slices/checkoutSlice";
import orderReducer from "./slices/orderSlice";
import walletReducer from "./slices/walletSlice";
import reviewReducer from "./slices/reviewSlice";
import userReducer from "./slices/userSlice";
import adminUsersReducer from "./slices/adminUsersSlice";
import adminproductsReducer from "./slices/adminProductsSlice";
import admincategoryReducer from "./slices/adminCategorySlice";
import adminorderReducer from "./slices/adminOrderSlice";
import adminreviewReducer from "./slices/adminReviewSlice";

// Empty root reducer - add your slices here as you create them
const rootReducer = combineReducers({
  address: addressReducer,
  products: productReducer,
  categories: categoryReducer,
  wishlist: wishlistReducer,
  cart: cartReducer,
  checkout: checkoutReducer,
  order: orderReducer,
  wallet: walletReducer,
  reviews: reviewReducer,
  user: userReducer,
  adminUsers: adminUsersReducer,
  adminProducts: adminproductsReducer,
  adminCategory: admincategoryReducer,
  adminOrders: adminorderReducer,
  adminReviews: adminreviewReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;
