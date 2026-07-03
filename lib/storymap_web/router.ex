defmodule StorymapWeb.Router do
  use StorymapWeb, :router

  import StorymapWeb.UserAuth
  alias Storymap.Admin
  alias StorymapWeb.Plugs.RequireAdminLevel

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {StorymapWeb.Layouts, :root}
    plug :protect_from_forgery

    plug :put_secure_browser_headers, %{
      "content-security-policy" =>
        "default-src 'self'; " <>
          "base-uri 'self'; " <>
          "form-action 'self'; " <>
          "frame-ancestors 'self'; " <>
          "img-src 'self' data: https:; " <>
          "media-src 'self' data: blob:; " <>
          "worker-src 'self' blob:; " <>
          "font-src 'self' data: https://fonts.gstatic.com; " <>
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " <>
          "script-src 'self' 'unsafe-inline'; " <>
          "connect-src 'self' https: wss: ws:"
    }

    plug :fetch_current_scope_for_user
  end

  pipeline :api do
    plug :accepts, ["json"]
  end

  pipeline :require_admin_api do
    plug RequireAdminLevel, min_admin_level: Admin.min_level()
  end

  pipeline :rate_limit_login do
    plug StorymapWeb.Plugs.RateLimit, limit: 10, window_sec: 60, format: :html
  end

  pipeline :rate_limit_api_writes do
    plug StorymapWeb.Plugs.RateLimit, limit: 60, window_sec: 60, format: :json
  end

  pipeline :rate_limit_api_reads do
    plug StorymapWeb.Plugs.RateLimit, limit: 300, window_sec: 60, format: :json
  end

  pipeline :rate_limit_api_tiles do
    plug StorymapWeb.Plugs.RateLimit, limit: 1200, window_sec: 60, format: :json
  end

  scope "/", StorymapWeb do
    pipe_through :browser

    # / and /map serve the main map page
    get "/", MapController, :index
    get "/map", MapController, :index

    # Sub-map community map (scoped pins; see docs/SUB_MAPS.md)
    get "/m/:community_url/map", MapController, :sub_map
  end

  scope "/api", StorymapWeb do
    pipe_through [:api, :rate_limit_api_reads, :fetch_session, :fetch_current_scope_for_user]

    # Public read operations (with optional authentication for user_id inclusion)
    get "/pins", PinController, :index
    get "/pins/:id/backlinks", PinController, :backlinks
    get "/pins/:pin_id/comments", PinCommentController, :index
    get "/pins/:id", PinController, :show

    get "/pins/:id/music_fields/:field_key", PinFieldBlobController, :show,
      private: %{blob_type: :music}

    get "/pins/:id/drawing_fields/:field_key", PinFieldBlobController, :show,
      private: %{blob_type: :drawing}

    get "/pin_types", PinTypeController, :index
    get "/pin_types/:slug", PinTypeController, :show
    get "/sub_maps", SubMapController, :index
    get "/sub_maps/:community_url", SubMapController, :show
    get "/sub_maps/:community_url/pins", SubMapController, :pins
  end

  scope "/api", StorymapWeb do
    pipe_through [:api, :rate_limit_api_tiles, :fetch_session, :fetch_current_scope_for_user]

    get "/map/style", MapController, :style
    get "/map/tiles.json", MapController, :tiles_json
    get "/tiles/:layer/:z/:x/:y", MapController, :tile
  end

  scope "/api", StorymapWeb do
    pipe_through [
      :api,
      :fetch_session,
      :protect_from_forgery,
      :fetch_current_scope_for_user,
      StorymapWeb.Plugs.RateLimitReportCreate
    ]

    post "/reports", ReportController, :create
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
    post "/pins/:pin_id/comments", PinCommentController, :create
    patch "/pins/:pin_id/comments/:id", PinCommentController, :update
    delete "/pins/:pin_id/comments/:id", PinCommentController, :delete
    put "/pins/:id", PinController, :update
    patch "/pins/:id", PinController, :update
    delete "/pins/:id", PinController, :delete

    post "/pins/:id/music_fields/:field_key", PinFieldBlobController, :create,
      private: %{blob_type: :music}

    put "/pins/:id/music_fields/:field_key", PinFieldBlobController, :update,
      private: %{blob_type: :music}

    delete "/pins/:id/music_fields/:field_key", PinFieldBlobController, :delete,
      private: %{blob_type: :music}

    post "/pins/:id/drawing_fields/:field_key", PinFieldBlobController, :create,
      private: %{blob_type: :drawing}

    put "/pins/:id/drawing_fields/:field_key", PinFieldBlobController, :update,
      private: %{blob_type: :drawing}

    delete "/pins/:id/drawing_fields/:field_key", PinFieldBlobController, :delete,
      private: %{blob_type: :drawing}

    post "/pin_types", PinTypeController, :create
    patch "/pin_types/:id", PinTypeController, :update
    delete "/pin_types/:id", PinTypeController, :delete
    post "/sub_maps", SubMapController, :create
    patch "/sub_maps/:community_url", SubMapController, :update

    patch "/sub_maps/:community_url/pin_type_settings",
          SubMapController,
          :update_pin_type_settings

    post "/sub_maps/:community_url/pins", SubMapController, :create_pin
    post "/sub_maps/:community_url/memberships", SubMapController, :join
    delete "/sub_maps/:community_url/memberships/me", SubMapController, :leave
    post "/sub_maps/:community_url/pins/:id/approve", SubMapController, :approve_pin
    post "/sub_maps/:community_url/pins/:id/reject", SubMapController, :reject_pin

    post "/pins/:id/heart", PinHeartController, :create
    delete "/pins/:id/heart", PinHeartController, :delete
  end

  scope "/api", StorymapWeb do
    pipe_through [
      :api,
      :fetch_session,
      :fetch_current_scope_for_user,
      :require_authenticated_user
    ]

    get "/me/pin_hearts", Me.PinHeartController, :index
    get "/me/pin_hearts/pins", Me.PinHeartController, :pins
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
      live "/saved", SavedLive.Index, :index
      live "/m/new", SubMapLive.New, :new
      live "/m/:community_url/settings", SubMapLive.Settings, :edit
      live "/m/:community_url/admin", SubMapLive.Admin, :index
      live "/pin-types/new", PinTypeLive.New, :new
      live "/pin-types/:id/edit", PinTypeLive.Edit, :edit
    end

    live_session :require_admin,
      on_mount: [
        {StorymapWeb.UserAuth, :require_authenticated},
        {StorymapWeb.AdminAuth, {:require_admin_level, Admin.min_level()}},
        {StorymapWeb.AdminNavSync, :default}
      ] do
      live "/admin/users", AdminLive.Users, :index
      live "/admin/activity", AdminLive.Activity, :index
      live "/admin/reports", AdminLive.Reports, :index
    end
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
      # Public pins list page
      live "/pins", PinLive.Index, :index
      live "/pin-types", PinTypeLive.Index, :index
      # Sub-map discovery (see docs/SUB_MAPS.md)
      live "/m", SubMapLive.Index, :index
      live "/m/:community_url", SubMapLive.Show, :show
      live "/privacy-policy", StaticLive.Privacy, :show
      live "/about", StaticLive.About, :show
      live "/vision", StaticLive.Vision, :show
      live "/help", StaticLive.Help, :show
    end

    delete "/users/log-out", UserSessionController, :delete
  end
end
