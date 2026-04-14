import { RouterProvider, createBrowserRouter } from "react-router";
import Dashboard from "../pages/Dashboard";
import Winner from "../pages/Winner";
import AdminLogin from "../pages/auth/AdminLogin";
import ProtectedDash from "./ProtectedDash";
import AddCustomer from "../pages/AddCustomer";

const AppRoutes = () => {
  const allRoutes = createBrowserRouter([
    {
      path: "",
      element: <ProtectedDash />,
      children: [
        { path: "", element: <Dashboard /> },
        { path: "add-customer", element: <AddCustomer /> },
        { path: "pickwinner", element: <Winner /> },
      ],
    },
    {
      path: "admin-login",
      element: <AdminLogin />,
    },
  ]);

  return <RouterProvider router={allRoutes} />;
};

export default AppRoutes;
