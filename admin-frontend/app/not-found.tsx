export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f5f5f5",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "4rem", margin: "0 0 1rem 0" }}>404</h1>
        <h2 style={{ fontSize: "1.5rem", margin: "0 0 1rem 0" }}>
          Page Not Found
        </h2>
        <p className="text-lg text-gray-600 mb-8">
          We couldn&apos;t find the page you&apos;re looking for.
        </p>
        <a
          href="/dashboard"
          style={{
            display: "inline-block",
            padding: "0.75rem 1.5rem",
            backgroundColor: "#007bff",
            color: "white",
            textDecoration: "none",
            borderRadius: "0.375rem",
            marginRight: "1rem",
          }}
        >
          Go to Dashboard
        </a>
        <a
          href="/login"
          style={{
            display: "inline-block",
            padding: "0.75rem 1.5rem",
            border: "1px solid #ccc",
            color: "#333",
            textDecoration: "none",
            borderRadius: "0.375rem",
          }}
        >
          Go to Login
        </a>
      </div>
    </div>
  );
}
