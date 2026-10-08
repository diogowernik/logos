import { redirect } from "next/navigation";
import { fetchCurrentUser } from "@/server/django";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage() {
  if (await fetchCurrentUser()) redirect("/");
  return (
    <Box
      component="main"
      sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", p: 2 }}
    >
      <Card component="section" sx={{ width: "100%", maxWidth: 380 }}>
        <CardHeader
          title="Logos"
          slotProps={{ title: { component: "h1", variant: "h6" } }}
        />
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </Box>
  );
}
