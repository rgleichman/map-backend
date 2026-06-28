defmodule Storymap.Pins.CommentAuthorizer do
  @moduledoc """
  API authorization for pin comments.
  """
  alias Storymap.Accounts.User
  alias Storymap.Pins.{Authorizer, Pin, PinComment, Policy}
  alias Storymap.SubMaps
  alias Storymap.SubMaps.Policy, as: SubMapPolicy
  alias Storymap.Types

  @spec authorize_list(User.t() | nil, Pin.t(), keyword()) :: :ok | {:error, :not_found}
  def authorize_list(user, %Pin{} = pin, opts \\ []) do
    Authorizer.authorize_show(user, pin, opts)
  end

  @spec authorize_create(User.t(), Pin.t(), keyword()) ::
          Types.authorize_result() | {:error, :not_found}
  def authorize_create(%User{} = user, %Pin{} = pin, opts \\ []) do
    with :ok <- authorize_list(user, pin, opts),
         :ok <- Policy.authorize_create(user) do
      :ok
    else
      {:error, :not_found} = err -> err
      {:error, :forbidden} = err -> err
    end
  end

  @spec authorize_update(User.t(), PinComment.t(), keyword()) :: Types.authorize_result()
  def authorize_update(%User{} = user, %PinComment{} = comment, _opts \\ []) do
    cond do
      Policy.muted?(user) ->
        {:error, :forbidden}

      PinComment.deleted?(comment) ->
        {:error, :forbidden}

      comment.user_id == user.id ->
        :ok

      true ->
        {:error, :forbidden}
    end
  end

  @spec authorize_delete(User.t(), Pin.t(), PinComment.t(), keyword()) :: Types.authorize_result()
  def authorize_delete(%User{} = user, %Pin{} = pin, %PinComment{} = comment, opts \\ []) do
    cond do
      Policy.muted?(user) ->
        {:error, :forbidden}

      comment.user_id == user.id ->
        :ok

      Policy.can_modify_pin?(user, pin) ->
        :ok

      pin.sub_map_id && sub_map_moderator?(user, pin, opts) ->
        :ok

      true ->
        {:error, :forbidden}
    end
  end

  defp sub_map_moderator?(%User{} = user, %Pin{} = pin, opts) do
    sub_map = SubMaps.resolve_for_pin(Keyword.get(opts, :sub_map), pin)
    membership = Keyword.get(opts, :membership)
    sub_map && SubMapPolicy.can_moderate?(user, sub_map, membership)
  end
end
