import { configureStore, combineReducers } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import uiReducer from "./uiSlice";
import projectsReducer from "./projectsSlice";

import collectionsReducer from "./collectionsSlice";
import documentsReducer from "./documentsSlice";

const rootReducer = combineReducers({
  auth: authReducer,
  ui: uiReducer,
  projects: projectsReducer,
  collections: collectionsReducer,
  documents: documentsReducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
        ignoredActionPaths: ["meta.arg", "payload.timestamp"],
        ignoredPaths: ["items.dates"],
      },
    }),
  devTools: process.env.NODE_ENV !== "production",
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
