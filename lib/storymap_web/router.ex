defmodule StorymapWeb.Router do
  use StorymapWeb, :router

  import StorymapWeb.UserAuth

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {StorymapWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
    plug :fetch_current_scope_for_user
  end

  pipeline :api do
    plug :accepts, ["json"]
  end

  pipeline :rate_limit_login do
    plug StorymapWeb.Plugs.RateLimit, limit: 10, window_sec: 60, format: :html
  end

  pipeline :rate_limit_api_writes do
    plug StorymapWeb.Plugs.RateLimit, limit: 60, window_sec: 60, format: :json
  end

  scope "/", StorymapWeb do
    pipe_through :browser

    # / and /map serve the main map page
    get "/", MapController, :index
    get "/map", MapController, :index
  end

  scope "/api", StorymapWeb do
    pipe_through [:api, :fetch_session, :fetch_current_scope_for_user]

    # Public read operations (with optional authentication for user_id inclusion)
    get "/pins", PinController, :index
    get "/pins/:id", PinController, :show
    get "/map/style", MapController, :style
  end

  # API write protection: session cookie (SameSite Lax), CSRF token (x-csrf-token),
  # and require_authenticated_user. Clients must send credentials and CSRF for mutations.
  scope "/api", StorymapWeb do
    pipe_through [
      :api,
      :rate_limit_api_writes,
      :fetch_session,
      :protect_from_forgery,
      :fetch_current_scope_for_user,
      :require_authenticated_user
    ]

    # Authenticated write operations
    post "/pins", PinController, :create
    put "/pins/:id", PinController, :update
    patch "/pins/:id", PinController, :update
    delete "/pins/:id", PinController, :delete
  end

  # Enable LiveDashboard and Swoosh mailbox preview in development
  if Application.compile_env(:storymap, :dev_routes) do
    # If you want to use the LiveDashboard in production, you should put
    # it behind authentication and allow only admins to access it.
    # If your application does not have an admins-only section yet,
    # you can use Plug.BasicAuth to set up some basic authentication
    # as long as you are also using SSL (which you should anyway).
    import Phoenix.LiveDashboard.Router

    scope "/dev" do
      pipe_through :browser

      live_dashboard "/dashboard", metrics: StorymapWeb.Telemetry
      forward "/mailbox", Plug.Swoosh.MailboxPreview
    end
  end

  ## Authentication routes

  scope "/", StorymapWeb do
    pipe_through [:browser, :require_authenticated_user]

    live_session :require_authenticated_user,
      on_mount: [{StorymapWeb.UserAuth, :require_authenticated}] do
      live "/users/settings", UserLive.Settings, :edit
      live "/users/settings/confirm-email/:token", UserLive.Settings, :confirm_email
    end

    post "/users/update-password", UserSessionController, :update_password
  end

  scope "/", StorymapWeb do
    pipe_through [:browser, :rate_limit_login]
    post "/users/log-in", UserSessionController, :create
  end

  scope "/", StorymapWeb do
    pipe_through [:browser]

    live_session :current_user,
      on_mount: [{StorymapWeb.UserAuth, :mount_current_scope}] do
      live "/users/register", UserLive.Registration, :new
      live "/users/log-in", UserLive.Login, :new
      live "/users/log-in/:token", UserLive.Confirmation, :new
      # Public user profile page
      live "/user/:user_id", UserLive.Show, :show
    end

    delete "/users/log-out", UserSessionController, :delete
  end
end
