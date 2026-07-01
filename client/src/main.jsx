import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App.jsx";
import { UserProvider } from "./context/UserContext.jsx";
import { CourseProvider } from "./context/CourseContext.jsx";
import "./App.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <UserProvider>
        <CourseProvider>
          <App />
          <Toaster position="top-center" />
        </CourseProvider>
      </UserProvider>
    </BrowserRouter>
  </React.StrictMode>
);
