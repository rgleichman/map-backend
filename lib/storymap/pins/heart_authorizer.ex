defmodule Storymap.Pins.HeartAuthorizer do
  @moduledoc """
  API authorization for pin hearts (private saves).
  """
  alias Storymap.Accounts.Policy, as: AccountsPolicy
  alias Storymap.Accounts.User
  alias Storymap.Pins.{Authorizer, AuthorizerOpts, Pin}
  alias Storymap.Types

  @spec authorize_heart(User.t(), Pin.t(), keyword()) ::
          Types.authorize_result() | {:error, :not_found}
  def authorize_heart(%User{} = user, %Pin{} = pin, opts \\ []) do
    with :ok <- authorize_list(user),
         :ok <- Authorizer.authorize_show(user, pin, opts) do
      :ok
    else
      {:error, :not_found} = err -> err
      {:error, :forbidden} = err -> err
    end
  end

  @spec authorize_list(User.t()) :: Types.authorize_result()
  def authorize_list(%User{} = user), do: AccountsPolicy.authorize_write?(user)

  @spec authorize_unheart(User.t()) :: Types.authorize_result()
  def authorize_unheart(%User{} = user), do: authorize_list(user)

  @spec authorizer_opts(User.t() | nil, Pin.t()) :: keyword()
  def authorizer_opts(user, %Pin{} = pin), do: AuthorizerOpts.for_pin(user, pin)
end
