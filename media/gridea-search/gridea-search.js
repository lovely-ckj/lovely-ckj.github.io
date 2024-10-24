/**
 * https://github.com/kytrun/gridea-search
 */

(function() {
  var UPDATE_TIME = document.getElementById('gridea-search-result').getAttribute('data-update')

  fillSearchInput()
  grideaSearch()
  
  var HtmlUtil = {
	// 使用正则实现html编码
	Encode: function(str) {
		var s = '';
		if(str.length === 0) {
			return '';
		}
		s = str.replace(/&/g,'&amp;');
		s = s.replace(/</g,'&lt;');
		s = s.replace(/>/g,'&gt;');
		s = s.replace(/ /g,'&nbsp;');
		s = s.replace(/\'/g,'&#39;');
		s= s.replace(/\"/g,'&quot;');
		return s;
	},
	
	// 使用正则实现html解码
	Decode: function(str) {
		var s = '';
		if(str.length === 0) {
			return '';
		}
		s = str.replace(/&amp;/g, '&');
		s = s.replace(/&lt;/g,'<');
		s = s.replace(/&gt;/g,'>');
		s = s.replace(/&nbsp;/g,' ');
		s = s.replace(/&#39;/g,'\'');
		s = s.replace(/&quot;/g,'\"');
		return s;
	}
}


  // 获取 url 参数
  function getParam(url, param) {
    if (url.indexOf('?') > -1) {
      var urlSearch = url.split('?')
      var paramList = urlSearch[1].split('&')
      for (var i = paramList.length - 1; i >= 0; i--) {
        var temp = paramList[i].split('=')
        if (temp[0] === param) {
          return temp[1]
        }
      }
    }
  }

  // 获取解码后的搜索词
  function getQueryPhrase() {
    var phrase = getParam(window.location.href, 'q') || ''
    var queryPhrase = decodeURIComponent(phrase.replace(/\+/g, ' '))
    return queryPhrase
  }

  // 填充搜索输入框
  function fillSearchInput() {
    var searchForm = document.getElementById('gridea-search-form')
    var searchInput = searchForm.getElementsByTagName('input')[0]
    searchInput.value = getQueryPhrase()
  }

  // 异步 GET 请求
  function get(obj) {
    var xhr = new XMLHttpRequest()
    xhr.open('get', obj.url, true)
    xhr.send(null)
    xhr.onreadystatechange = function() {
      // 异步请求：响应状态为4，数据加载完毕
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          obj.success(xhr.responseText)
        } else {
          obj.error(xhr.status)
        }
      }
    }
    xhr.addEventListener("progress",function(e){
    	var pre=e.loaded/1024,tot=e.total/1024;
	    pre=pre.toFixed(2),tot=tot.toFixed(2);
	    if(e.lengthComputable){
	        document.getElementById('progress').innerHTML="加载中，已接收 "+pre+" / "+tot+" (KB) | "+Math.floor(e.loaded/e.total*10000)/100+"%";
	    }
	    else{
	    	document.getElementById('progress').innerHTML="加载中，已接收 "+pre+" (KB)";
	    }
	});
  }

  // 模糊搜索 https://github.com/krisk/fuse
  function fuzzySearch(data, phrase) {
    var options = {
      includeMatches: true,
      ignoreLocation: true,
      keys: [
        'title',
        'content'
      ]
    }
    // eslint-disable-next-line no-undef
    var fuse = new Fuse(data, options)
    var fuzzyResult = fuse.search(phrase)
    return fuzzyResult
  }

  // 显示无搜索结果
  function showNoResult() {
    var resultDIV = document.getElementById('gridea-search-result')
    var noResult = resultDIV.getElementsByClassName('no-result')[0]
    noResult.style.display = 'block'
    resultDIV.innerHTML = noResult.outerHTML
  }

  // 获取搜索结果列表模板的 URL
  function getTemplateURL() {
    var scripts = document.getElementsByTagName('script')
    var templateURL = ''
    for (var i = 0; i < scripts.length; i++) {
      if (scripts[i].type === 'text/ejs') {
        templateURL = scripts[i].src
        return templateURL
      }
    }
  }

  // 渲染搜索结果列表 ejs https://github.com/mde/ejs
  function renderResult(searchedInfos) {
    if (searchedInfos.posts.length > 0) {
      get({
        url: getTemplateURL() + '?_=' + UPDATE_TIME,
        success: function(data) {
          var resultDIV = document.getElementById('gridea-search-result')
          // eslint-disable-next-line no-undef
          resultDIV.innerHTML = ejs.compile(data)(searchedInfos)
        }
      })
    } else {
      showNoResult()
    }
  }

  // 搜索结果关键字高亮
  function keywordHighlightTitle(searchedContent) {
    var searchedPostContent = searchedContent.item.title// 搜索结果标题预览
    var preview = ''
	var f=true
	for(var i=0;i<searchedContent.matches.length;i++)
	{
		if (searchedContent.matches[i].key === 'title') { // 如果匹配到文章标题，截取关键字
			var mxlen=0,mxj=0
			for(var j=0;j<searchedContent.matches[i].indices.length;j++)
			{
				var indices = searchedContent.matches[i].indices[j]
				if(indices[1]-indices[0]+1>mxlen) mxlen=indices[1]-indices[0]+1,mxj=j;
			}
			var indices = searchedContent.matches[i].indices[mxj]
			var beforeKeyword = searchedPostContent.substring(0, indices[0])// 关键字前
			var keyword = searchedPostContent.substring(indices[0], indices[1] + 1)// 关键字
			var afterKeyword = searchedPostContent.substring(indices[1] + 1)// 关键字后
			preview = HtmlUtil.Encode(beforeKeyword) + '<span class="searched-keyword">' +
					HtmlUtil.Encode(keyword) + '</span>' + HtmlUtil.Encode(afterKeyword)
			f=false
		}
	}
	if(f) preview = HtmlUtil.Encode(searchedPostContent)
    return preview
  }
  function keywordHighlight(searchedContent) {
    var searchedPostContent = searchedContent.item.content// 搜索结果内容预览
    var preview = ''
	var f=true
	for(var i=0;i<searchedContent.matches.length;i++)
	{
		if (searchedContent.matches[i].key === 'content') { // 如果匹配到文章内容，截取关键字
			var mxlen=0,mxj=0
			for(var j=0;j<searchedContent.matches[i].indices.length;j++)
			{
				var indices = searchedContent.matches[i].indices[j]
				if(indices[1]-indices[0]+1>mxlen) mxlen=indices[1]-indices[0]+1,mxj=j;
			}
			var indices = searchedContent.matches[i].indices[mxj]
			var beforeKeyword = searchedPostContent.substring(indices[0] - 10, indices[0])// 关键字前10字
			var keyword = searchedPostContent.substring(indices[0], indices[1] + 1)// 关键字
			var afterKeyword = searchedPostContent.substring(indices[1] + 1, indices[1] + 70)// 关键字后70字
			preview = HtmlUtil.Encode(beforeKeyword) + '<span class="searched-keyword">' +
					HtmlUtil.Encode(keyword) + '</span>' + HtmlUtil.Encode(afterKeyword) + '...'
			f=false;
			// for(var j=0;j<searchedContent.matches[i].indices.length;j++)
			// {
				// var indices = searchedContent.matches[i].indices[j]
				// var beforeKeyword = searchedPostContent.substring(indices[0] - 10, indices[0])// 关键字前10字
				// var keyword = searchedPostContent.substring(indices[0], indices[1] + 1)// 关键字
				// var afterKeyword = searchedPostContent.substring(indices[1] + 1, indices[1] + 70)// 关键字后70字
				// preview = preview + HtmlUtil.Encode(beforeKeyword) + '<span class="searched-keyword">' +
						// HtmlUtil.Encode(keyword) + '</span>' + HtmlUtil.Encode(afterKeyword) + '...'
			// }
		}
	}
	if(f) preview = HtmlUtil.Encode(searchedPostContent.substring(0, 80)) + (searchedPostContent.length>80?'...':'')
    return preview
  }

  // 获取博客信息 api
  function getApi(callback) {
    get({
      url: '../api/index.html' + '?_=' + UPDATE_TIME,
      success: function(data) {
        callback(JSON.parse(data))
      }
    })
  }

  // 根据一段文本调用模糊搜索
  function searchBy(phrase, callback) {
    var result = ''
    // 根据全文内容获取搜索结果
    getApi(function(response) {
	  for(var i=0;i<response.posts.length;i++) response.posts[i].content=HtmlUtil.Decode(response.posts[i].content);
      result = fuzzySearch(response.posts, phrase)
      var mergedResult = mergeResult(response, result)
      callback(mergedResult)
    })
  }

  // 根据解码后的搜索词执行搜索
  function searchByPhrase(resultHandler) {
    var queryPhrase = getQueryPhrase()
    if (queryPhrase === '' || typeof (queryPhrase) === 'undefined') {
      showNoResult()
    } else {
      searchBy(queryPhrase, resultHandler)
    }
  }

  // 插入高亮预览结果
  function mergeResult(response, searchedResult) {
    var postsMap = {}
    for (var i = 0; i < response.posts.length; i++) {
      postsMap[response.posts[i].link] = response.posts[i]
    }

    response.posts = []
    for (var j = 0; j < searchedResult.length; j++) {
      var post = postsMap[searchedResult[j].item.link]
	  post.title = keywordHighlightTitle(searchedResult[j])
      post.searchedPreview = keywordHighlight(searchedResult[j])// 预览关键字高亮
      response.posts.push(post)
    }
    return response
  }

  // 主方法
  function grideaSearch() {
    // 搜索结果回调
    searchByPhrase(function(searchedContents) {
      renderResult(searchedContents)
    })
  }
})()
