NATIVE_VERSION=$1
GAME_ID=$2
VERSION=$3
DEBUG=$4

# key 路徑必須每次 build 唯一：cocos-build 是 exec pipeline、同一台機器上多個 build 並行，
# 固定路徑會被別的 build 結束時的清理刪掉（症狀：Identity file not accessible / 無法連線）
KEY=$(mktemp /tmp/id_rsa.XXXXXXXX)
echo "$GITEA_KEY" > "$KEY" && chmod 600 "$KEY" && trap "rm -f $KEY" EXIT
export GIT_SSH_COMMAND="ssh -i $KEY -o StrictHostKeyChecking=no"

# clone
git clone -b $NATIVE_VERSION git@git.circusmonkey.cc:tools/cocos-creator-native.git
code=$?
echo "clone return $code"
if [[ $code != "0" ]]; then
    rm -f "$KEY"
    exit 1
fi

# build
cocos-creator-native/v3/build.sh $VERSION $GAME_ID $DEBUG
code=$?
echo "build return $code"
if [[ $code != "0" ]]; then
    rm -f "$KEY"
    exit 1
fi

# 最後清理 key 即可
rm -f "$KEY"