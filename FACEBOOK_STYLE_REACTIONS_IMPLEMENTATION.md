# Facebook-Style Reactions & Comment Replies Implementation Guide

## Overview
This implementation adds Facebook-style features to your social media app:
- **Top 3 Reactions Display**: Shows the top 3 most-used reaction emojis with total count
- **Comment Replies**: Nested replies to comments with full reaction support
- **Integrated Across All Screens**: HomeFeed, Profile, WhisperWall, and CityRadar

## What's Been Created

### 1. New Components

#### `Top3ReactionsDisplay.tsx`
A reusable component that displays the top 3 reaction emojis with total count.

**Features:**
- Automatically calculates top 3 reactions by count
- Overlapping emoji display (Facebook-style)
- Three sizes: small, medium, large
- Optional onPress handler for showing reaction details
- Returns null if no reactions (clean UI)

**Usage:**
```tsx
import { Top3ReactionsDisplay } from '../components/Top3ReactionsDisplay';

<Top3ReactionsDisplay
  reactionCounts={post.reactionCounts}
  size="medium"
  onPress={() => showReactionDetails(post._id)}
/>
```

#### `CommentReplySection.tsx`
A comprehensive component for displaying comments with nested replies.

**Features:**
- Comment display with avatar and username
- Reply input with inline submission
- View/hide replies toggle
- Reactions on both comments and replies
- Top 3 reactions display for comments and replies
- Lazy loading of replies
- Timestamp display

**Usage:**
```tsx
import { CommentReplySection } from '../components/CommentReplySection';

<CommentReplySection
  comment={comment}
  onReply={handleReply}
  onReactToComment={handleReactToComment}
  onReactToReply={handleReactToReply}
  onLoadReplies={handleLoadReplies}
/>
```

### 2. Backend Updates

#### Post Model (`backend/models/Post.js`)
- Added `reactionCounts` to comments (funny, love, total)
- Added `replies` array to comments with full structure
- Each reply has its own reactions and reactionCounts

#### Reactions Routes (`backend/routes/reactions.js`)
New endpoints:
- `POST /api/reactions/comments/:postId/:commentId` - React to comment
- `DELETE /api/reactions/comments/:postId/:commentId` - Remove comment reaction
- `POST /api/reactions/comments/:postId/:commentId/replies/:replyId` - React to reply
- `DELETE /api/reactions/comments/:postId/:commentId/replies/:replyId` - Remove reply reaction

All endpoints now return `reactionCounts` object with top 3 calculation support.

#### Posts Routes (`backend/routes/posts.js`)
New endpoints:
- `POST /api/posts/:postId/comments/:commentId/replies` - Add reply to comment
- `GET /api/posts/:postId/comments/:commentId/replies` - Get all replies for a comment

### 3. Frontend API Services

#### `frontend/src/services/api.ts`
New methods in `postsAPI`:
- `addReply(postId, commentId, content)` - Add a reply to a comment
- `getReplies(postId, commentId)` - Fetch replies for a comment

#### `frontend/src/services/reactions.ts`
New methods in `reactionsAPI`:
- `addCommentReaction(postId, commentId, reactionType)` - React to comment
- `removeCommentReaction(postId, commentId)` - Remove comment reaction
- `addReplyReaction(postId, commentId, replyId, reactionType)` - React to reply
- `removeReplyReaction(postId, commentId, replyId)` - Remove reply reaction

## Integration Steps

### Step 1: Update HomeScreen.tsx

Add Top3ReactionsDisplay to post cards:

```tsx
import { Top3ReactionsDisplay } from '../../components/Top3ReactionsDisplay';

// In your post card render:
<View style={styles.actionButtons}>
  {/* Replace the old reaction count display with: */}
  <Top3ReactionsDisplay
    reactionCounts={post.reactionCounts}
    size="medium"
    onPress={() => showReactionPopup(post._id)}
  />
  
  {/* Keep existing action buttons */}
  <TouchableOpacity
    style={styles.actionBtn}
    onPress={() => navigation.navigate('PostDetail', { postId: post._id })}
  >
    <Text style={styles.actionBtnIcon}>💬</Text>
    <Text style={styles.actionBtnText}>Comment</Text>
    <Text style={styles.actionBtnCount}>{post.comments?.length || 0}</Text>
  </TouchableOpacity>
</View>
```

### Step 2: Update ProfileScreen.tsx

Same as HomeScreen - add Top3ReactionsDisplay to your post cards in the profile view.

### Step 3: Update PostDetailScreen.tsx

Replace comment section with CommentReplySection:

```tsx
import { CommentReplySection } from '../../components/CommentReplySection';
import { postsAPI } from '../../services/api';
import { reactionsAPI } from '../../services/reactions';

// Add handlers:
const handleReply = async (commentId: string, content: string) => {
  try {
    const response = await postsAPI.addReply(postId, commentId, content);
    if (response.success) {
      // Reload post to get updated comments
      await loadPost();
      Toast.show({
        type: 'success',
        text1: 'Reply added',
        text2: 'Your reply has been posted',
      });
    }
  } catch (error) {
    console.error('Error adding reply:', error);
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: 'Failed to add reply',
    });
  }
};

const handleReactToComment = async (commentId: string, reactionType: 'funny' | 'love') => {
  try {
    const comment = post.comments.find(c => c._id === commentId);
    if (comment?.userReaction === reactionType) {
      await reactionsAPI.removeCommentReaction(postId, commentId);
    } else {
      await reactionsAPI.addCommentReaction(postId, commentId, reactionType);
    }
    await loadPost();
  } catch (error) {
    console.error('Error reacting to comment:', error);
  }
};

const handleReactToReply = async (commentId: string, replyId: string, reactionType: 'funny' | 'love') => {
  try {
    const comment = post.comments.find(c => c._id === commentId);
    const reply = comment?.replies?.find(r => r._id === replyId);
    if (reply?.userReaction === reactionType) {
      await reactionsAPI.removeReplyReaction(postId, commentId, replyId);
    } else {
      await reactionsAPI.addReplyReaction(postId, commentId, replyId, reactionType);
    }
    await loadPost();
  } catch (error) {
    console.error('Error reacting to reply:', error);
  }
};

const handleLoadReplies = async (commentId: string) => {
  try {
    const response = await postsAPI.getReplies(postId, commentId);
    if (response.success) {
      // Update the comment with loaded replies
      setPost(prevPost => ({
        ...prevPost,
        comments: prevPost.comments.map(c =>
          c._id === commentId ? { ...c, replies: response.replies } : c
        ),
      }));
    }
  } catch (error) {
    console.error('Error loading replies:', error);
  }
};

// In your render:
{post.comments.map((comment) => (
  <CommentReplySection
    key={comment._id}
    comment={comment}
    onReply={handleReply}
    onReactToComment={handleReactToComment}
    onReactToReply={handleReactToReply}
    onLoadReplies={handleLoadReplies}
  />
))}
```

### Step 4: Update WhisperWallScreen.tsx

Add Top3ReactionsDisplay to WhisperBubble component:

```tsx
// In WhisperBubble.tsx or WhisperWallScreen.tsx:
import { Top3ReactionsDisplay } from '../Top3ReactionsDisplay';

// In your whisper card render:
<View style={styles.whisperFooter}>
  <Top3ReactionsDisplay
    reactionCounts={whisper.reactions}
    size="small"
  />
  <Text style={styles.whisperTime}>{formatTimeAgo(whisper.createdAt)}</Text>
</View>
```

### Step 5: Update CityRadarScreen.tsx

Add Top3ReactionsDisplay to location post cards:

```tsx
import { Top3ReactionsDisplay } from '../../components/Top3ReactionsDisplay';

// In your post card render:
<View style={styles.postFooter}>
  <Top3ReactionsDisplay
    reactionCounts={post.reactionCounts}
    size="medium"
  />
  <TouchableOpacity onPress={() => navigation.navigate('PostDetail', { postId: post._id })}>
    <Text style={styles.viewDetails}>View Details →</Text>
  </TouchableOpacity>
</View>
```

## Backend Migration (If Needed)

If you have existing posts/comments without reactionCounts, run this migration:

```javascript
// backend/scripts/migrateReactionCounts.js
const mongoose = require('mongoose');
const Post = require('../models/Post');

async function migrateReactionCounts() {
  const posts = await Post.find({});
  
  for (const post of posts) {
    let updated = false;
    
    // Update comment reaction counts
    for (const comment of post.comments) {
      if (!comment.reactionCounts) {
        comment.reactionCounts = {
          funny: comment.reactions.funny.length,
          love: comment.reactions.love.length,
          total: comment.reactions.funny.length + comment.reactions.love.length
        };
        updated = true;
      }
      
      // Initialize replies array if not exists
      if (!comment.replies) {
        comment.replies = [];
        updated = true;
      }
    }
    
    if (updated) {
      await post.save();
      console.log(`Updated post ${post._id}`);
    }
  }
  
  console.log('Migration complete!');
}

// Run: node backend/scripts/migrateReactionCounts.js
```

## Testing Checklist

### HomeFeed & Profile
- [ ] Top 3 reactions display correctly on posts
- [ ] Clicking reactions shows reaction popup
- [ ] Reaction counts update in real-time
- [ ] Empty state (no reactions) shows nothing

### Post Detail Screen
- [ ] Comments display with Top 3 reactions
- [ ] Reply button opens reply input
- [ ] Replies display nested under comments
- [ ] Can react to comments (❤️ Like)
- [ ] Can react to replies (❤️ Like)
- [ ] View/Hide replies toggle works
- [ ] Reply count shows correctly

### WhisperWall
- [ ] Top 3 reactions display on sticky notes
- [ ] Reactions update when users react
- [ ] Anonymous reactions work correctly

### CityRadar
- [ ] Top 3 reactions display on location posts
- [ ] Reactions work with location-based posts
- [ ] Poll posts still show correctly

## Styling Customization

The Top3ReactionsDisplay component uses your theme colors. Customize in the component:

```tsx
// Adjust sizes
const iconSizes = {
  small: 16,   // Change these values
  medium: 20,
  large: 24,
};

// Adjust spacing
const containerPadding = {
  small: 4,
  medium: 6,
  large: 8,
};
```

## Performance Considerations

1. **Lazy Loading**: Replies are loaded on-demand when user clicks "View replies"
2. **Optimistic Updates**: UI updates immediately, then syncs with server
3. **Caching**: Consider caching reaction counts to reduce API calls
4. **Pagination**: For posts with many replies, implement pagination

## Future Enhancements

1. **Reaction Details Modal**: Show who reacted with what emoji
2. **Animated Reactions**: Add animation when reacting (like Facebook)
3. **Long Press Menu**: Quick react without opening popup
4. **Notification System**: Notify users when someone replies to their comment
5. **Edit/Delete Replies**: Allow users to manage their replies
6. **Mention System**: @mention users in replies

## Troubleshooting

### Reactions not updating
- Check network tab for API errors
- Verify authentication token is valid
- Check backend logs for errors

### Replies not showing
- Ensure `onLoadReplies` is implemented
- Check if replies array exists in comment object
- Verify API endpoint is returning data

### Top 3 not calculating correctly
- Check reactionCounts object structure
- Verify backend is updating counts on reaction
- Run migration script if using existing data

## Support

For issues or questions:
1. Check backend logs: `npm run dev` in backend folder
2. Check frontend console: React Native debugger
3. Verify API endpoints are accessible
4. Check database for correct data structure

---

**Implementation Status**: ✅ Complete
**Last Updated**: 2025-11-30
**Version**: 1.0.0
